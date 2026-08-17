"""
Multimodal turns for the Reach WebSocket (``chat`` / ``direct_agent`` with ``images``).

Home Assistant clients (Comstar Vision) send ordered stills as
``images: [{mimeType, dataBase64, name?}]`` and expect a short plain-text reply.
Those turns bypass the planner and CrewAI entirely: an overlay skill like
``vision_plain_reply`` forbids tool/MCP JSON, and the crew path cannot pass pixels
to a model anyway — it would answer from the prompt text alone.

Fail closed. When no vision-capable model is configured, raise
``VisionModelUnavailableError`` instead of letting a text-only model hallucinate a
classification from the prompt.
"""

from __future__ import annotations

import base64
import binascii
import os
import re
import time
from pathlib import Path
from typing import Any, Callable

#: Wire MIME types accepted from Reach clients.
ALLOWED_IMAGE_MIME_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)

DEFAULT_MAX_IMAGES = 16
DEFAULT_MAX_IMAGE_BYTES = 4 * 1024 * 1024
DEFAULT_MAX_TOTAL_BYTES = 20 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 180.0

#: Optional soft model hint HA prepends to ``text`` (``[model=gpt-4o-mini]\n…``).
_MODEL_HINT_RE = re.compile(r"^\s*\[model\s*=\s*([^\]]{1,120})\]\s*\n?", re.IGNORECASE)

#: Model-name tokens that imply image input. Deliberately excludes plain instruct
#: tags like ``qwen2.5:14b-instruct`` (text-only despite the vision-capable family).
_VISION_NAME_TOKENS = (
    "vision",
    "llava",
    "bakllava",
    "moondream",
    "pixtral",
    "minicpm-v",
    "internvl",
    "cogvlm",
    "idefics",
    "granite3.2-vision",
)

#: ``vl`` / ``vlm`` as a model-name segment: qwen2.5vl, qwen2-vl, glm-4v-vlm.
_VISION_NAME_RE = re.compile(r"(?<![a-z])vlm?(?![a-z])", re.IGNORECASE)

_OPENAI_VISION_RE = re.compile(
    r"^(gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5|chatgpt-|o1$|o1-|o3$|o3-|o4$|o4-)",
    re.IGNORECASE,
)


class ReachImageError(ValueError):
    """Malformed ``images`` payload (shape, MIME type, or base64)."""

    code = "invalid_images"


class ReachImageTooLargeError(ReachImageError):
    """``images`` exceeded the per-image, count, or total byte budget."""

    code = "payload_too_large"


class VisionModelUnavailableError(RuntimeError):
    """A multimodal turn arrived but no vision-capable model is configured."""

    code = "vision_unavailable"


class VisionAnswerError(RuntimeError):
    """The vision model replied with tool JSON or nothing usable."""

    code = "vision_answer_unusable"


class ReachImage:
    """One decoded still, in the order the client sent it."""

    __slots__ = ("mime_type", "data", "name")

    def __init__(self, *, mime_type: str, data: bytes, name: str = "") -> None:
        self.mime_type = mime_type
        self.data = data
        self.name = name

    @property
    def data_url(self) -> str:
        b64 = base64.standard_b64encode(self.data).decode("ascii")
        return f"data:{self.mime_type};base64,{b64}"


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def max_images() -> int:
    return _env_int("AGENTIC_REACH_MAX_IMAGES", DEFAULT_MAX_IMAGES)


def max_image_bytes() -> int:
    return _env_int("AGENTIC_REACH_MAX_IMAGE_BYTES", DEFAULT_MAX_IMAGE_BYTES)


def max_total_image_bytes() -> int:
    return _env_int("AGENTIC_REACH_MAX_IMAGES_TOTAL_BYTES", DEFAULT_MAX_TOTAL_BYTES)


def vision_timeout_seconds() -> float:
    raw = os.getenv("AGENTIC_REACH_VISION_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return value if value > 0 else DEFAULT_TIMEOUT_SECONDS


def ollama_api_base() -> str:
    """LiteLLM ``api_base`` for ``ollama/*`` models.

    Read straight from the env rather than through ``agent_providers`` — the vision
    path never builds a CrewAI agent and should not import that stack.
    """
    raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    if raw.startswith(("http://", "https://")):
        return raw.rstrip("/")
    return f"http://{raw.rstrip('/')}"


def parse_reach_images(raw: Any) -> list[ReachImage]:
    """Decode a Reach ``images`` field. Missing / empty means a text-only turn."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ReachImageError("images must be a list of {mimeType, dataBase64} objects")
    if not raw:
        return []

    limit = max_images()
    if len(raw) > limit:
        raise ReachImageTooLargeError(f"too many images: {len(raw)} (limit {limit})")

    per_image_cap = max_image_bytes()
    total_cap = max_total_image_bytes()
    out: list[ReachImage] = []
    total = 0
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ReachImageError(f"images[{index}] must be an object")
        mime = str(item.get("mimeType") or item.get("mime_type") or "").strip().lower()
        if mime not in ALLOWED_IMAGE_MIME_TYPES:
            allowed = ", ".join(sorted(ALLOWED_IMAGE_MIME_TYPES))
            raise ReachImageError(
                f"images[{index}] mimeType {mime or '(missing)'!r} not supported; use one of {allowed}"
            )
        b64 = str(item.get("dataBase64") or item.get("data_base64") or "").strip()
        if not b64:
            raise ReachImageError(f"images[{index}] is missing dataBase64")
        try:
            data = base64.b64decode(b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ReachImageError(f"images[{index}] dataBase64 is not valid base64: {exc}") from exc
        if not data:
            raise ReachImageError(f"images[{index}] decoded to zero bytes")
        if len(data) > per_image_cap:
            raise ReachImageTooLargeError(
                f"images[{index}] is {len(data)} bytes (limit {per_image_cap})"
            )
        total += len(data)
        if total > total_cap:
            raise ReachImageTooLargeError(
                f"images exceed the total budget of {total_cap} bytes"
            )
        out.append(
            ReachImage(
                mime_type=mime,
                data=data,
                name=str(item.get("name") or "").strip()[:200],
            )
        )
    return out


def model_supports_images(model: str) -> bool:
    """Best-effort image-input capability check by model id.

    Conservative on purpose: an unknown model is treated as text-only so a
    multimodal turn fails closed rather than answering from the prompt alone.
    """
    raw = str(model or "").strip().lower()
    if not raw:
        return False
    bare = raw.split("/", 1)[1] if "/" in raw else raw
    if _OPENAI_VISION_RE.match(bare):
        return True
    if any(token in raw for token in _VISION_NAME_TOKENS):
        return True
    return bool(_VISION_NAME_RE.search(raw))


def split_model_hint(text: str) -> tuple[str, str]:
    """Split a leading ``[model=…]`` hint off the prompt. Returns ``(hint, prompt)``."""
    raw = str(text or "")
    match = _MODEL_HINT_RE.match(raw)
    if not match:
        return "", raw.strip()
    return match.group(1).strip(), raw[match.end() :].strip()


def _normalize_litellm_model(model: str) -> str:
    """Give LiteLLM an explicit provider prefix so routing is unambiguous."""
    raw = str(model or "").strip()
    if not raw or "/" in raw:
        return raw
    if _OPENAI_VISION_RE.match(raw):
        return f"openai/{raw}"
    return f"ollama/{raw}"


def resolve_vision_model(
    *,
    model_hint: str = "",
    agent_entry: dict[str, Any] | None = None,
) -> str:
    """Pick a vision-capable model, or raise ``VisionModelUnavailableError``.

    Only vision-capable candidates are honored — a text-only fallback would answer
    a camera prompt without ever seeing the stills.
    """
    candidates: list[str] = [
        model_hint,
        os.getenv("AGENTIC_REACH_VISION_MODEL", ""),
        str((agent_entry or {}).get("model") or ""),
        os.getenv("AGENTIC_MEDIA_VISION_MODEL", ""),
        os.getenv("AGENTIC_VIDEO_VISION_MODEL", ""),
    ]
    for candidate in candidates:
        clean = str(candidate or "").strip()
        if clean and model_supports_images(clean):
            return _normalize_litellm_model(clean)
    if os.getenv("OPENAI_API_KEY", "").strip():
        return "openai/gpt-4o-mini"
    raise VisionModelUnavailableError(
        "this request includes images but no vision-capable model is configured; "
        "set AGENTIC_REACH_VISION_MODEL to a VLM (or OPENAI_API_KEY for gpt-4o-mini). "
        "Text-only models are refused so the reply cannot be invented."
    )


def build_vision_messages(
    *,
    prompt: str,
    images: list[ReachImage],
    system_prompt: str = "",
) -> list[dict[str, Any]]:
    """OpenAI-style messages: system, then text + ordered ``image_url`` parts."""
    content: list[dict[str, Any]] = [{"type": "text", "text": str(prompt or "").strip()}]
    for image in images:
        content.append({"type": "image_url", "image_url": {"url": image.data_url}})
    messages: list[dict[str, Any]] = []
    system = str(system_prompt or "").strip()
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": content})
    return messages


def system_prompt_for_agent(entry: dict[str, Any] | None) -> str:
    """System text from an overlay / catalog agent entry (no tools, no MCP).

    Reach clients bake skill bodies into ``backstory`` before registering the
    overlay, so backstory alone carries the reply contract.
    """
    if not isinstance(entry, dict):
        return ""
    explicit = str(entry.get("system_prompt") or "").strip()
    if explicit:
        return explicit
    parts: list[str] = []
    for key in ("role", "goal", "backstory"):
        value = str(entry.get(key) or "").strip()
        if value:
            parts.append(value)
    return "\n\n".join(parts)


def load_vision_agent_entry(
    *,
    agent_provider_id: str,
    tool_root: Path | None = None,
) -> dict[str, Any] | None:
    """Best-effort catalog / overlay lookup. Never fails the run on a miss."""
    pid = str(agent_provider_id or "").strip()
    if not pid:
        return None
    try:
        from orchestration.direct_agent import load_agent_entry
        from orchestration.dynamic_run import catalog_paths

        paths = catalog_paths(tool_root)
        return load_agent_entry(agent_provider_id=pid, catalog_path=paths.agent_providers)
    except Exception:  # noqa: BLE001
        return None


def _completion_text(response: Any) -> str:
    if hasattr(response, "model_dump"):
        try:
            response = response.model_dump()
        except Exception:  # noqa: BLE001
            pass
    elif hasattr(response, "dict"):
        try:
            response = response.dict()
        except Exception:  # noqa: BLE001
            pass
    if not isinstance(response, dict):
        return ""
    choices = response.get("choices") or []
    first = choices[0] if isinstance(choices, list) and choices else {}
    if not isinstance(first, dict):
        return ""
    message = first.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    return content.strip() if isinstance(content, str) else ""


def _record_usage(
    response: Any,
    *,
    model: str,
    ok: bool,
    latency_ms: float,
    tool_root: Path | None = None,
) -> None:
    try:
        from orchestration.llm_usage import normalize_openai_usage, record_llm_usage

        usage = (
            response.get("usage")
            if isinstance(response, dict)
            else getattr(response, "usage", None)
        )
        norm = normalize_openai_usage(usage)
        record_llm_usage(
            source="reach_vision",
            model=model,
            prompt_tokens=norm["prompt_tokens"],
            completion_tokens=norm["completion_tokens"],
            total_tokens=norm["total_tokens"],
            latency_ms=latency_ms,
            ok=ok,
            tool_root=tool_root,
        )
    except Exception:  # noqa: BLE001
        pass


def run_reach_multimodal(
    *,
    text: str,
    images: list[ReachImage],
    agent_provider_id: str = "",
    tool_root: Path | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> str:
    """Answer a multimodal Reach turn with a single vision completion.

    No planner, no crew, no MCP — the consumer contract is plain text only.
    """
    if not images:
        raise ValueError("run_reach_multimodal requires at least one image")

    def progress(line: str) -> None:
        if on_progress is not None:
            on_progress(line)

    model_hint, prompt = split_model_hint(text)
    if not prompt:
        prompt = "Describe what is visible in these images."

    entry = load_vision_agent_entry(agent_provider_id=agent_provider_id, tool_root=tool_root)
    model = resolve_vision_model(model_hint=model_hint, agent_entry=entry)
    progress(f"vision model={model} images={len(images)}")

    try:
        import litellm  # type: ignore[import-not-found]
    except Exception as exc:  # noqa: BLE001
        raise VisionModelUnavailableError(
            f"LiteLLM is required for multimodal Reach turns but is unavailable: {exc}"
        ) from exc

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": build_vision_messages(
            prompt=prompt,
            images=images,
            system_prompt=system_prompt_for_agent(entry),
        ),
        "temperature": 0.1,
        "timeout": vision_timeout_seconds(),
    }
    if model.lower().startswith("ollama/"):
        kwargs["api_base"] = ollama_api_base()

    progress("generating")
    started = time.monotonic()
    response = litellm.completion(**kwargs)
    latency_ms = round((time.monotonic() - started) * 1000, 1)

    raw = _completion_text(response)
    _record_usage(
        response, model=model, ok=bool(raw), latency_ms=latency_ms, tool_root=tool_root
    )

    from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak
    from orchestration.text_normalize import sanitize_user_facing_prose

    answer = sanitize_user_facing_prose(raw)
    if looks_like_mcp_tool_call_leak(raw) or not answer:
        # Never fall back to a text-only guess: an invented PERSON line would
        # trigger a real household notification.
        raise VisionAnswerError(
            f"vision model {model} returned no usable plain-text answer"
        )
    return answer
