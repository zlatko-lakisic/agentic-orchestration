"""Detect host hardware capabilities and filter provider catalog entries."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from typing import Any

_ARCH_CPU = "cpu"
_ARCH_GPU = "gpu"
_ARCH_TPU = "tpu"
_KNOWN_ARCHS = frozenset({_ARCH_CPU, _ARCH_GPU, _ARCH_TPU})


def _env_flag(name: str) -> bool:
    v = os.getenv(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _parse_architectures(raw: Any) -> set[str]:
    """
    Normalize architecture declarations to {"cpu","gpu","tpu"}.

    Accepted forms:
    - scalar string: "gpu" or "cpu,gpu"
    - list/tuple: ["gpu", "tpu"]
    """
    out: set[str] = set()
    if raw is None:
        return out
    if isinstance(raw, str):
        for part in re.split(r"[\s,;/|]+", raw.strip().lower()):
            if part in _KNOWN_ARCHS:
                out.add(part)
        return out
    if isinstance(raw, (list, tuple)):
        for item in raw:
            out.update(_parse_architectures(item))
        return out
    return out


def provider_required_architectures(entry: dict[str, Any]) -> set[str]:
    """
    Resolve a provider's required runtimes (`cpu`/`gpu`/`tpu`).

    Priority:
    1) ``hardware.architecture`` (preferred)
    2) ``architectures`` (legacy/shortcut)
    3) defaults by provider type
    """
    hardware = entry.get("hardware")
    hardware_arch_raw: Any = None
    if isinstance(hardware, dict):
        hardware_arch_raw = hardware.get("architecture")
    required = _parse_architectures(hardware_arch_raw)
    if required:
        return required

    required = _parse_architectures(entry.get("architectures"))
    if required:
        return required

    # By default, local Ollama models can run on CPU or GPU.
    typ = str(entry.get("type", "")).strip().lower()
    if typ == "ollama":
        return {_ARCH_CPU, _ARCH_GPU}
    # Cloud/backends without explicit local runtime constraints remain unrestricted.
    return set()


def detect_available_architectures() -> set[str]:
    """
    Detect available local runtimes.

    - Always includes CPU.
    - GPU when NVIDIA tooling, macOS Metal GPU (AMD/Intel/Apple), Linux amdgpu, or
      ``AGENTIC_ASSUME_GPU`` is set.
    - TPU based on common TPU runtime env markers (or user override).
    """
    override = _parse_architectures(os.getenv("AGENTIC_AVAILABLE_ARCHITECTURES", ""))
    if override:
        return override

    out = {_ARCH_CPU}
    if (
        _env_flag("AGENTIC_ASSUME_GPU")
        or shutil.which("nvidia-smi") is not None
        or _local_non_nvidia_gpu_present()
    ):
        out.add(_ARCH_GPU)
    if (
        _env_flag("AGENTIC_ASSUME_TPU")
        or os.getenv("COLAB_TPU_ADDR", "").strip()
        or os.getenv("TPU_NAME", "").strip()
        or os.getenv("TPU_WORKER_ID", "").strip()
        or os.getenv("XRT_TPU_CONFIG", "").strip()
        or os.getenv("LIBTPU_INIT_ARGS", "").strip()
        or os.getenv("PJRT_DEVICE", "").strip().lower() == "tpu"
    ):
        out.add(_ARCH_TPU)
    return out


def _local_non_nvidia_gpu_present() -> bool:
    """True when macOS/Linux expose an AMD/Intel/Apple GPU we can size against."""
    try:
        from orchestration.host_metrics import sample_gpu

        hit = sample_gpu()
    except Exception:  # noqa: BLE001
        return False
    if not hit:
        return False
    # A named GPU or any VRAM/util signal counts.
    return bool(
        hit.get("name")
        or hit.get("vramTotalGb")
        or (isinstance(hit.get("percent"), (int, float)))
    )


def provider_min_vram_gb(entry: dict[str, Any]) -> float | None:
    """Explicit minimum from YAML: ``min_vram_gb`` or ``hardware.min_vram_gb``."""
    raw = entry.get("min_vram_gb")
    if raw is None and isinstance(entry.get("hardware"), dict):
        raw = entry["hardware"].get("min_vram_gb")
    if raw is None:
        return None
    try:
        v = float(raw)
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


def _heuristic_min_vram_gb_for_ollama_model(model: str) -> float | None:
    """Rough local VRAM needs when YAML omits ``min_vram_gb`` (full catalog coverage)."""
    m = model.strip().lower()
    if not m:
        return None
    if re.search(r"\b(405|272|132|120|80|72|70|65|60)b\b", m):
        return 40.0
    if re.search(r"\b(40|36|34|32|30)b\b", m):
        return 22.0
    if any(
        x in m
        for x in (
            "mixtral",
            "qwq",
            "magistral",
            "granite4",
            "deepseek-v3",
            "deepseek-v2.5",
            "deepseek-v2",
        )
    ):
        return 16.0
    if any(
        x in m
        for x in (
            "deepseek-r1",
            "deepscaler",
            "openthinker",
            "lfm2.5-thinking",
            "phi4-reasoning",
        )
    ):
        return 14.0
    if any(x in m for x in ("vision", "vl-", "-vl", "llava", "moondream", "minicpm-v", "qwen2.5vl", "qwen3-vl")):
        return 10.0
    if any(x in m for x in ("codestral", "qwen3-coder-next", "devstral", "15b", "13b")):
        return 12.0
    if any(x in m for x in ("tinyllama", "smollm", "1b", "2b", "3b")):
        return 4.0
    # Typical 7B / small instruct class
    return 8.0


def effective_min_vram_gb(entry: dict[str, Any]) -> float | None:
    """Requirement used for filtering: explicit YAML, else optional Ollama heuristic."""
    explicit = provider_min_vram_gb(entry)
    if explicit is not None:
        return explicit
    if os.getenv("AGENTIC_VRAM_HEURISTICS", "1").strip().lower() in ("0", "false", "no", "off"):
        return None
    typ = str(entry.get("type", "")).strip().lower()
    if typ != "ollama":
        return None
    return _heuristic_min_vram_gb_for_ollama_model(str(entry.get("model", "")))


def detect_max_nvidia_vram_gb() -> float | None:
    """Largest single-GPU dedicated memory via ``nvidia-smi`` (GiB). None if unavailable."""
    override = os.getenv("AGENTIC_ASSUME_VRAM_GB", "").strip()
    if override:
        try:
            v = float(override)
            return v if v > 0 else None
        except ValueError:
            pass

    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
            check=False,
        )
        if out.returncode != 0 or not (out.stdout or "").strip():
            return None
        mib_values: list[float] = []
        for line in out.stdout.strip().splitlines():
            part = line.strip()
            if not part:
                continue
            try:
                mib_values.append(float(part.split(",")[0].strip()))
            except ValueError:
                continue
        if not mib_values:
            return None
        max_mib = max(mib_values)
        return max_mib / 1024.0
    except (OSError, subprocess.TimeoutExpired):
        return None


def _apply_vram_caps(vram_gb: float) -> float:
    """
    Apply user-defined VRAM caps.

    - AGENTIC_MAX_VRAM_GB: absolute cap in GiB
    - AGENTIC_MAX_VRAM_FRACTION: multiplier in (0, 1]; e.g. 0.7 to treat 8 GiB as 5.6 GiB
    """
    v = float(vram_gb)

    frac_raw = os.getenv("AGENTIC_MAX_VRAM_FRACTION", "").strip()
    if frac_raw:
        try:
            frac = float(frac_raw)
            if frac > 0:
                v *= min(1.0, frac)
        except ValueError:
            pass

    cap_raw = os.getenv("AGENTIC_MAX_VRAM_GB", "").strip()
    if cap_raw:
        try:
            cap = float(cap_raw)
            if cap > 0:
                v = min(v, cap)
        except ValueError:
            pass

    return v


def filter_catalog_by_vram(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], float | None]:
    """Drop agent-provider catalog entries whose ``effective_min_vram_gb`` exceeds detected VRAM."""
    if os.getenv("AGENTIC_DISABLE_HARDWARE_FILTER", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return list(entries), [], None

    vram = detect_max_nvidia_vram_gb()
    if vram is None:
        return list(entries), [], None
    vram = _apply_vram_caps(vram)

    kept: list[dict[str, Any]] = []
    excluded: list[str] = []
    for e in entries:
        req = effective_min_vram_gb(e)
        pid = str(e.get("id", "")).strip()
        if req is None:
            kept.append(e)
            continue
        if vram >= req:
            kept.append(e)
        elif pid:
            excluded.append(pid)

    return kept, excluded, vram


def filter_catalog_by_architecture(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], set[str]]:
    """
    Drop catalog entries that require an unavailable architecture.

    Entries with no declared architecture are treated as unrestricted.
    """
    if os.getenv("AGENTIC_DISABLE_HARDWARE_FILTER", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return list(entries), [], set()

    available = detect_available_architectures()
    kept: list[dict[str, Any]] = []
    excluded: list[str] = []
    for e in entries:
        req = provider_required_architectures(e)
        pid = str(e.get("id", "")).strip()
        if not req or req.intersection(available):
            kept.append(e)
        elif pid:
            excluded.append(pid)
    return kept, excluded, available


def detect_vram_gb_available() -> float | None:
    """
    VRAM budget available for a *concurrently resident* model set (GiB).

    ``AGENTIC_VRAM_GB`` wins when set (explicit budget, useful for unified-memory
    boards where nvidia-smi lies or is absent). Otherwise prefers the largest
    detected GPU (NVIDIA / macOS AMD-Intel / Linux amdgpu) with the usual
    ``AGENTIC_MAX_VRAM_*`` caps applied. ``None`` means "unknown" — callers should
    degrade to a single model rather than guess.
    """
    override = os.getenv("AGENTIC_VRAM_GB", "").strip()
    if override:
        try:
            value = float(override)
            if value > 0:
                return _apply_vram_caps(value)
        except ValueError:
            pass
    detected = detect_max_nvidia_vram_gb()
    if detected is None:
        detected = detect_max_vram_gb_non_nvidia()
    if detected is None:
        return None
    return _apply_vram_caps(detected)


def detect_max_vram_gb_non_nvidia() -> float | None:
    """Largest discrete VRAM from macOS/Linux AMD/Intel samplers (not nvidia-smi)."""
    try:
        from orchestration.host_metrics import sample_gpu

        hit = sample_gpu()
    except Exception:  # noqa: BLE001
        return None
    if not hit:
        return None
    # Skip assume-only / util-only Apple unified samples without a real total.
    src = str(hit.get("vramSource") or "")
    if src == "nvidia-smi":
        return None
    total = hit.get("vramTotalGb")
    try:
        value = float(total) if total is not None else 0.0
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _resident_headroom_gb() -> float:
    """Reserve for KV cache / framework overhead before packing models."""
    raw = os.getenv("AGENTIC_RESIDENT_HEADROOM_GB", "").strip()
    try:
        value = float(raw) if raw else 1.0
    except ValueError:
        value = 1.0
    return max(0.0, value)


def _max_resident_models() -> int:
    raw = os.getenv("AGENTIC_MAX_RESIDENT_MODELS", "").strip()
    try:
        value = int(raw) if raw else 4
    except ValueError:
        value = 4
    return max(1, min(32, value))


def plan_resident_models(
    catalog_entries: list[dict[str, Any]],
    *,
    vram_gb_available: float | None,
    required_ids: list[str] | None = None,
) -> dict[str, Any]:
    """
    Plan a set of models that can stay loaded at the same time without VRAM thrash.

    Packs providers smallest-requirement-first up to ``vram_gb_available`` minus
    ``AGENTIC_RESIDENT_HEADROOM_GB``, capped at ``AGENTIC_MAX_RESIDENT_MODELS``.
    Providers with no VRAM requirement (cloud/remote) are always resident and cost
    nothing. Graceful degradation: an unknown budget keeps a single local model, and a
    budget too small for anything returns an empty selection with per-provider reasons
    rather than raising.

    When ``required_ids`` is set, those providers are packed first. If they do not all
    fit (or an id is missing from the catalog), ``fit`` is ``False`` and ``reason``
    explains why — callers (e.g. a meeting fan-out that needs two 3b agents resident)
    can fail fast instead of thrashing.

    Returns ``{selected, skipped, budgetGb, headroomGb, usedGb, degraded, fit, reason,
    requiredIds}`` where ``skipped`` is a list of ``{id, reason, requiredGb}``.
    """
    headroom = _resident_headroom_gb()
    budget = None if vram_gb_available is None else max(0.0, float(vram_gb_available) - headroom)
    max_models = _max_resident_models()

    by_id: dict[str, dict[str, Any]] = {}
    priced: list[tuple[str, float | None, dict[str, Any]]] = []
    for entry in catalog_entries or []:
        pid = str(entry.get("id", "")).strip()
        if not pid:
            continue
        by_id[pid] = entry
        priced.append((pid, effective_min_vram_gb(entry), entry))

    required = [str(x).strip() for x in (required_ids or []) if str(x).strip()]
    # Preserve caller order while de-duplicating.
    seen_req: set[str] = set()
    required_unique: list[str] = []
    for rid in required:
        if rid not in seen_req:
            seen_req.add(rid)
            required_unique.append(rid)
    required = required_unique

    missing = [rid for rid in required if rid not in by_id]
    if missing:
        return {
            "selected": [],
            "skipped": [
                {
                    "id": rid,
                    "reason": "required provider id not in catalog",
                    "requiredGb": None,
                }
                for rid in missing
            ],
            "budgetGb": budget,
            "headroomGb": headroom,
            "usedGb": 0.0,
            "maxResidentModels": max_models,
            "degraded": True,
            "fit": False,
            "reason": f"required provider id(s) not in catalog: {', '.join(missing)}",
            "requiredIds": required,
        }

    # Smallest first so a modest budget holds several small models instead of one big one.
    priced.sort(key=lambda item: (item[1] is not None, item[1] or 0.0, item[0]))

    selected: list[str] = []
    skipped: list[dict[str, Any]] = []
    used = 0.0
    local_selected = 0
    selected_set: set[str] = set()
    #: Ollama model tags already charged against the resident budget (same weights
    #: shared by multiple provider ids — e.g. meeting SE + BizDev on qwen2.5:3b).
    charged_models: set[str] = set()

    def _model_key(entry: dict[str, Any]) -> str | None:
        typ = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
        if typ != "ollama":
            return None
        model = str(entry.get("model") or "").removeprefix("ollama/").strip()
        return model.casefold() if model else None

    def _try_add(pid: str, required_gb: float | None, *, forced: bool) -> bool:
        nonlocal used, local_selected
        if pid in selected_set:
            return True
        entry = by_id.get(pid) or {}
        model_key = _model_key(entry)
        # Second provider sharing an already-resident Ollama weights file costs 0 GiB.
        charge = 0.0 if (model_key and model_key in charged_models) else (required_gb or 0.0)

        if required_gb is None:
            selected.append(pid)
            selected_set.add(pid)
            return True
        if len(selected_set) >= max_models:
            skipped.append(
                {
                    "id": pid,
                    "reason": f"resident model cap reached (AGENTIC_MAX_RESIDENT_MODELS={max_models})",
                    "requiredGb": required_gb,
                }
            )
            return False
        if charge <= 0 and model_key and model_key in charged_models:
            selected.append(pid)
            selected_set.add(pid)
            return True
        if budget is None:
            if local_selected >= 1 and not forced:
                skipped.append(
                    {
                        "id": pid,
                        "reason": "VRAM budget unknown; degraded to one resident local model "
                        "(set AGENTIC_VRAM_GB)",
                        "requiredGb": required_gb,
                    }
                )
                return False
            if local_selected >= 1 and forced and charge > 0:
                skipped.append(
                    {
                        "id": pid,
                        "reason": "VRAM budget unknown; cannot guarantee concurrent residency "
                        "for the required set (set AGENTIC_VRAM_GB)",
                        "requiredGb": required_gb,
                    }
                )
                return False
            selected.append(pid)
            selected_set.add(pid)
            if charge > 0:
                local_selected += 1
                used += charge
                if model_key:
                    charged_models.add(model_key)
            return True
        if used + charge <= budget:
            selected.append(pid)
            selected_set.add(pid)
            if charge > 0:
                local_selected += 1
                used += charge
                if model_key:
                    charged_models.add(model_key)
            return True
        skipped.append(
            {
                "id": pid,
                "reason": (
                    f"needs {required_gb:.1f} GiB; only {max(0.0, budget - used):.1f} GiB of the "
                    f"{budget:.1f} GiB resident budget left"
                ),
                "requiredGb": required_gb,
            }
        )
        return False

    # Required providers first (stable caller order), then the rest by size.
    unfit_required: list[str] = []
    for rid in required:
        req_gb = effective_min_vram_gb(by_id[rid])
        if not _try_add(rid, req_gb, forced=True):
            unfit_required.append(rid)

    if unfit_required:
        return {
            "selected": list(selected),
            "skipped": skipped,
            "budgetGb": budget,
            "headroomGb": headroom,
            "usedGb": round(used, 2),
            "maxResidentModels": max_models,
            "degraded": True,
            "fit": False,
            "reason": (
                "required resident set does not fit concurrent VRAM budget: "
                + ", ".join(unfit_required)
            ),
            "requiredIds": required,
        }

    for pid, required_gb, _entry in priced:
        if pid in selected_set:
            continue
        _try_add(pid, required_gb, forced=False)

    fit = True
    reason = None
    if required and not set(required).issubset(selected_set):
        fit = False
        reason = "required resident set incomplete after packing"
    return {
        "selected": selected,
        "skipped": skipped,
        "budgetGb": budget,
        "headroomGb": headroom,
        "usedGb": round(used, 2),
        "maxResidentModels": max_models,
        "degraded": budget is None or bool(skipped),
        "fit": fit,
        "reason": reason,
        "requiredIds": required,
    }


def filter_catalog_by_hardware(
    entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str], float | None, set[str]]:
    """
    Apply architecture and VRAM filtering.

    Returns: (kept_entries, excluded_ids, detected_vram_gb_or_none, available_architectures)
    """
    arch_kept, arch_excluded, available_arch = filter_catalog_by_architecture(entries)
    vram_kept, vram_excluded, vram = filter_catalog_by_vram(arch_kept)
    return vram_kept, [*arch_excluded, *vram_excluded], vram, available_arch
