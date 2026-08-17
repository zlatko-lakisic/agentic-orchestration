"""Reach multimodal turns: payload limits, capability gating, and fail-closed routing."""

from __future__ import annotations

import base64
from typing import Any

import pytest

from orchestration.reach_multimodal import (
    ReachImage,
    ReachImageError,
    ReachImageTooLargeError,
    VisionAnswerError,
    VisionModelUnavailableError,
    build_vision_messages,
    model_supports_images,
    parse_reach_images,
    resolve_vision_model,
    run_reach_multimodal,
    split_model_hint,
    system_prompt_for_agent,
)

pytestmark = pytest.mark.unit

_JPEG = b"\xff\xd8\xff\xe0" + b"stub jpeg bytes"


def _image_payload(name: str = "gate_1.jpg", *, data: bytes = _JPEG) -> dict[str, Any]:
    return {
        "mimeType": "image/jpeg",
        "dataBase64": base64.standard_b64encode(data).decode("ascii"),
        "name": name,
    }


@pytest.fixture(autouse=True)
def _clear_vision_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "AGENTIC_REACH_VISION_MODEL",
        "AGENTIC_MEDIA_VISION_MODEL",
        "AGENTIC_VIDEO_VISION_MODEL",
        "AGENTIC_REACH_MAX_IMAGES",
        "AGENTIC_REACH_MAX_IMAGE_BYTES",
        "AGENTIC_REACH_MAX_IMAGES_TOTAL_BYTES",
        "OPENAI_API_KEY",
    ):
        monkeypatch.delenv(key, raising=False)


# ---- payload parsing -------------------------------------------------------


def test_missing_or_empty_images_is_a_text_only_turn() -> None:
    assert parse_reach_images(None) == []
    assert parse_reach_images([]) == []


def test_parse_preserves_client_order() -> None:
    images = parse_reach_images([_image_payload("first.jpg"), _image_payload("second.jpg")])
    assert [img.name for img in images] == ["first.jpg", "second.jpg"]
    assert images[0].data == _JPEG


def test_parse_accepts_snake_case_aliases() -> None:
    images = parse_reach_images(
        [{"mime_type": "image/png", "data_base64": base64.standard_b64encode(b"png").decode()}]
    )
    assert images[0].mime_type == "image/png"


def test_parse_rejects_non_list() -> None:
    with pytest.raises(ReachImageError):
        parse_reach_images({"mimeType": "image/jpeg"})


def test_parse_rejects_unsupported_mime() -> None:
    payload = _image_payload()
    payload["mimeType"] = "application/pdf"
    with pytest.raises(ReachImageError) as exc:
        parse_reach_images([payload])
    assert exc.value.code == "invalid_images"


def test_parse_rejects_bad_base64() -> None:
    with pytest.raises(ReachImageError):
        parse_reach_images([{"mimeType": "image/jpeg", "dataBase64": "not base64!!"}])


def test_parse_rejects_missing_data() -> None:
    with pytest.raises(ReachImageError):
        parse_reach_images([{"mimeType": "image/jpeg"}])


def test_too_many_images_is_payload_too_large(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_MAX_IMAGES", "2")
    with pytest.raises(ReachImageTooLargeError) as exc:
        parse_reach_images([_image_payload() for _ in range(3)])
    assert exc.value.code == "payload_too_large"


def test_oversized_single_image_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_MAX_IMAGE_BYTES", "8")
    with pytest.raises(ReachImageTooLargeError):
        parse_reach_images([_image_payload(data=b"x" * 64)])


def test_total_budget_is_enforced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_MAX_IMAGES_TOTAL_BYTES", "40")
    with pytest.raises(ReachImageTooLargeError):
        parse_reach_images([_image_payload(data=b"x" * 30) for _ in range(2)])


# ---- capability + model resolution ----------------------------------------


@pytest.mark.parametrize(
    "model",
    [
        "gpt-4o-mini",
        "openai/gpt-4o",
        "gpt-4.1-mini",
        "ollama/llava:13b",
        "qwen2.5vl:latest",
        "moondream",
        "granite3.2-vision",
        "ollama/llama3.2-vision:11b",
    ],
)
def test_vision_models_are_recognized(model: str) -> None:
    assert model_supports_images(model) is True


@pytest.mark.parametrize(
    "model",
    ["qwen2.5:14b-instruct", "llama3.2:3b", "mistral-nemo", "granite-code", "", "gpt-3.5-turbo"],
)
def test_text_only_models_are_refused(model: str) -> None:
    assert model_supports_images(model) is False


def test_resolve_prefers_the_client_model_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_VISION_MODEL", "ollama/llava")
    assert resolve_vision_model(model_hint="gpt-4o-mini") == "openai/gpt-4o-mini"


def test_resolve_ignores_a_text_only_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_VISION_MODEL", "ollama/llava")
    assert resolve_vision_model(model_hint="qwen2.5:14b-instruct") == "ollama/llava"


def test_resolve_uses_overlay_agent_model() -> None:
    entry = {"id": "client.vision_scene_analyzer", "type": "ollama", "model": "gpt-4o-mini"}
    assert resolve_vision_model(agent_entry=entry) == "openai/gpt-4o-mini"


def test_resolve_skips_text_only_overlay_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_VIDEO_VISION_MODEL", "ollama/llava")
    entry = {"model": "qwen2.5:14b-instruct"}
    assert resolve_vision_model(agent_entry=entry) == "ollama/llava"


def test_resolve_falls_back_to_openai_when_key_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    assert resolve_vision_model() == "openai/gpt-4o-mini"


def test_resolve_fails_closed_without_any_vision_model() -> None:
    with pytest.raises(VisionModelUnavailableError) as exc:
        resolve_vision_model(agent_entry={"model": "qwen2.5:14b-instruct"})
    assert exc.value.code == "vision_unavailable"


def test_bare_ollama_tag_gets_a_provider_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_REACH_VISION_MODEL", "llava:13b")
    assert resolve_vision_model() == "ollama/llava:13b"


# ---- prompt shaping --------------------------------------------------------


def test_split_model_hint_extracts_and_strips() -> None:
    hint, prompt = split_model_hint("[model=gpt-4o-mini]\nSecurity camera stills…")
    assert hint == "gpt-4o-mini"
    assert prompt == "Security camera stills…"


def test_split_model_hint_leaves_plain_text_alone() -> None:
    hint, prompt = split_model_hint("Describe the driveway")
    assert hint == ""
    assert prompt == "Describe the driveway"


def test_messages_put_text_first_then_ordered_images() -> None:
    images = [
        ReachImage(mime_type="image/jpeg", data=b"one", name="1.jpg"),
        ReachImage(mime_type="image/jpeg", data=b"two", name="2.jpg"),
    ]
    messages = build_vision_messages(prompt="classify", images=images, system_prompt="be terse")
    assert messages[0] == {"role": "system", "content": "be terse"}
    content = messages[1]["content"]
    assert content[0] == {"type": "text", "text": "classify"}
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1]) == b"one"
    assert base64.b64decode(content[2]["image_url"]["url"].split(",", 1)[1]) == b"two"


def test_system_prompt_prefers_explicit_field() -> None:
    entry = {"system_prompt": "You analyze stills.", "backstory": "ignored"}
    assert system_prompt_for_agent(entry) == "You analyze stills."


def test_system_prompt_falls_back_to_role_goal_backstory() -> None:
    entry = {"role": "Analyst", "goal": "Classify", "backstory": "## Plain reply"}
    assert system_prompt_for_agent(entry) == "Analyst\n\nClassify\n\n## Plain reply"


# ---- completion path -------------------------------------------------------


class _FakeLiteLLM:
    def __init__(self, content: str) -> None:
        self.content = content
        self.calls: list[dict[str, Any]] = []

    def completion(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(kwargs)
        return {
            "choices": [{"message": {"content": self.content}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 3, "total_tokens": 13},
        }


@pytest.fixture
def fake_litellm(monkeypatch: pytest.MonkeyPatch, tmp_path):
    import sys

    # Keep the best-effort usage ledger out of the repo tree.
    monkeypatch.setenv("AGENTIC_TOOL_ROOT", str(tmp_path))

    def install(content: str) -> _FakeLiteLLM:
        fake = _FakeLiteLLM(content)
        monkeypatch.setitem(sys.modules, "litellm", fake)
        return fake

    return install


def test_run_returns_plain_text_answer(
    fake_litellm, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_REACH_VISION_MODEL", "openai/gpt-4o-mini")
    fake = fake_litellm("PERSON\nSomeone at the gate.\nPerson at gate")
    images = parse_reach_images([_image_payload()])

    answer = run_reach_multimodal(text="classify these", images=images)

    assert answer.splitlines()[0] == "PERSON"
    assert fake.calls[0]["model"] == "openai/gpt-4o-mini"
    assert fake.calls[0]["timeout"] >= 120


def test_run_strips_the_model_hint_from_the_prompt(
    fake_litellm, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    fake = fake_litellm("CLEAR\nNothing there.\nAll clear")

    run_reach_multimodal(
        text="[model=gpt-4o-mini]\nWhat is at the gate?",
        images=parse_reach_images([_image_payload()]),
    )

    user_content = fake.calls[0]["messages"][-1]["content"]
    assert user_content[0]["text"] == "What is at the gate?"


def test_run_sets_api_base_for_ollama_models(
    fake_litellm, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_REACH_VISION_MODEL", "ollama/llava")
    monkeypatch.setenv("OLLAMA_API_BASE", "http://ollama.test:11434")
    fake = fake_litellm("CLEAR\nEmpty.\nClear")

    run_reach_multimodal(text="classify", images=parse_reach_images([_image_payload()]))

    assert fake.calls[0]["api_base"].startswith("http://ollama.test:11434")


def test_run_refuses_when_no_vision_model_is_configured() -> None:
    with pytest.raises(VisionModelUnavailableError):
        run_reach_multimodal(text="classify", images=parse_reach_images([_image_payload()]))


def test_run_rejects_tool_call_json_instead_of_inventing_a_label(
    fake_litellm, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    fake_litellm('{"name": "describe_image_file", "parameters": {"path": "/tmp/gate.jpg"}}')

    with pytest.raises(VisionAnswerError):
        run_reach_multimodal(text="classify", images=parse_reach_images([_image_payload()]))


def test_run_rejects_an_empty_answer(fake_litellm, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    fake_litellm("   ")

    with pytest.raises(VisionAnswerError):
        run_reach_multimodal(text="classify", images=parse_reach_images([_image_payload()]))


def test_run_requires_at_least_one_image() -> None:
    with pytest.raises(ValueError):
        run_reach_multimodal(text="classify", images=[])


def test_run_uses_the_registered_overlay_agent_model_and_prompt(
    fake_litellm, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A Reach client registers its vision agent as an overlay, not in the catalog."""
    from orchestration.session_overlay import (
        overlay_run_context,
        register_overlay,
        reset_overlays_for_tests,
    )

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    reset_overlays_for_tests()
    register_overlay(
        user_id="ada",
        session_id="sess-vision",
        connection_id="conn-1",
        app_id="comstar-ha",
        agents=[
            {
                "id": "client.vision_scene_analyzer",
                "type": "ollama",
                "model": "gpt-4o-mini",
                "role": "Scene analyzer",
                "goal": "Classify camera stills",
                "backstory": "## Plain reply\nReply with three lines. No tool JSON.",
            }
        ],
    )
    fake = fake_litellm("PERSON\nSomeone at the gate.\nPerson at gate")

    try:
        with overlay_run_context(user_id="ada", session_id="sess-vision"):
            run_reach_multimodal(
                text="who is at the gate",
                images=parse_reach_images([_image_payload()]),
                agent_provider_id="client.vision_scene_analyzer",
            )
    finally:
        reset_overlays_for_tests()

    assert fake.calls[0]["model"] == "openai/gpt-4o-mini"
    assert "Plain reply" in fake.calls[0]["messages"][0]["content"]
