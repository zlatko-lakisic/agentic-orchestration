from orchestration.text_normalize import (
    sanitize_user_facing_prose,
    strip_wrapping_quotes,
    unwrap_json_speakable,
)


def test_strip_wrapping_quotes_straight_double() -> None:
    assert strip_wrapping_quotes('"Hello!"') == "Hello!"


def test_strip_wrapping_quotes_curly() -> None:
    assert strip_wrapping_quotes("\u201cHi\u201d") == "Hi"


def test_strip_wrapping_quotes_keeps_inner_quotes() -> None:
    assert strip_wrapping_quotes('Say "hello"') == 'Say "hello"'


def test_sanitize_user_facing_prose_unwraps_boxed_final_answer() -> None:
    raw = (
        "You HAVE to put what YOU think is there according to all that was provided "
        "previously (the GitHub link) in plain natural language. Skip all the previous "
        '"requirements" analysis -- simply use plain text.\n\n'
        "The final answer is $\\boxed{This is a model-agnostic multi-agent orchestration "
        "built on CrewAI.}$"
    )
    out = sanitize_user_facing_prose(raw)
    assert out == "This is a model-agnostic multi-agent orchestration built on CrewAI."
    assert "\\boxed" not in out
    assert "you have to" not in out.lower()


def test_sanitize_user_facing_prose_keeps_plain_prose() -> None:
    text = "This repo orchestrates CrewAI agents with YAML catalogs."
    assert sanitize_user_facing_prose(text) == text


def test_sanitize_user_facing_prose_strips_tool_call_leak() -> None:
    leaked = 'name: analyze\nparameters: {"url":"https://example.com"}'
    assert sanitize_user_facing_prose(leaked) == ""


def test_sanitize_user_facing_prose_strips_format_instruction_echo() -> None:
    from orchestration.text_normalize import looks_like_format_instruction_only

    echoed = "Please provide your answer using only plain text (short paragraphs or bullet lists)."
    assert looks_like_format_instruction_only(echoed)
    assert sanitize_user_facing_prose(echoed) == ""


def test_unwrap_json_speakable_prefers_spoken_keys() -> None:
    raw = '{"spoken":"The front porch light is on.","entities":["light.porch"]}'
    assert unwrap_json_speakable(raw) == "The front porch light is on."


def test_unwrap_json_speakable_fenced_and_answer_key() -> None:
    raw = '```json\n{"answer":"Garden got about two inches yesterday."}\n```'
    assert unwrap_json_speakable(raw) == "Garden got about two inches yesterday."


def test_unwrap_json_speakable_leaves_tool_stub_for_leak_detector() -> None:
    stub = '{"name":"GetLiveContext","parameters":{}}'
    assert unwrap_json_speakable(stub) == stub


def test_unwrap_json_speakable_blanks_opaque_machine_json() -> None:
    raw = '{"entity_id":"sensor.x","state":"on","attributes":{"foo":1}}'
    assert unwrap_json_speakable(raw) == ""


def test_sanitize_user_facing_prose_unwraps_json_answer(monkeypatch) -> None:
    """sanitize path: JSON Final Answer → speakable prose (stub media import)."""
    import sys
    import types

    stub = types.ModuleType("orchestration.media_grounding")
    stub.strip_skill_echo_tokens = lambda t: t  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "orchestration.media_grounding", stub)

    assert (
        sanitize_user_facing_prose('{"spoken":"The porch light is on."}')
        == "The porch light is on."
    )
    assert (
        sanitize_user_facing_prose(
            '{"entity_id":"sensor.x","state":"on","attributes":{}}'
        )
        == ""
    )
    assert sanitize_user_facing_prose('{"name":"GetLiveContext","parameters":{}}') == ""
