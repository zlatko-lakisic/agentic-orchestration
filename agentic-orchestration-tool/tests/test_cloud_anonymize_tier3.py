"""Unit tests for Tier 3 cloud anonymization: reversible token maps, tool-result
scrubbing, optional Presidio NER, and the vision "prefer local" guard."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.cloud_anonymize import (
    bind_token_map,
    clear_token_map,
    get_token_map,
    redact_for_cloud,
    redact_tool_result_for_cloud,
    restore_tokens,
    set_token_map_session,
)
from orchestration.cloud_anonymize_tier3 import TokenMap, apply_ner_redaction, presidio_available


@pytest.fixture(autouse=True)
def _reset_token_map():
    clear_token_map()
    yield
    clear_token_map()


# --- Reversible token maps ---------------------------------------------------


def test_reversible_default_on_mints_numbered_placeholder(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.delenv("AGENTIC_ANONYMIZE_REVERSIBLE", raising=False)
    out = redact_for_cloud("mail jane@acme.com", force=True)
    assert out == "mail [EMAIL:1]"


def test_reversible_same_original_same_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    raw = "Contact jane@acme.com twice: jane@acme.com and once more jane@acme.com."
    out = redact_for_cloud(raw, force=True)
    assert out.count("[EMAIL:1]") == 3
    assert "[EMAIL:2]" not in out
    # A different email gets a distinct, incrementing token.
    out2 = redact_for_cloud("also john@acme.com", force=True)
    assert "[EMAIL:2]" in out2


def test_reversible_distinguishes_kinds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    raw = "Email jane@acme.com or call +1 (555) 123-4567."
    out = redact_for_cloud(raw, force=True)
    assert "[EMAIL:1]" in out
    assert "[PHONE:1]" in out


def test_restore_tokens_recovers_originals(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    raw = "Contact jane@acme.com about SSN 123-45-6789."
    scrubbed = redact_for_cloud(raw, force=True)
    assert "jane@acme.com" not in scrubbed
    restored = restore_tokens(scrubbed)
    assert restored == raw


def test_restore_tokens_noop_without_bound_map() -> None:
    clear_token_map()
    text = "already has [EMAIL:1] but no map is bound"
    assert restore_tokens(text) == text


def test_reversible_disabled_uses_static_placeholder(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")
    out = redact_for_cloud("mail jane@acme.com", force=True)
    assert out == "mail [EMAIL]"


def test_token_map_bind_and_get() -> None:
    tm = TokenMap()
    tok = tm.token_for("secret@corp.example", "EMAIL")
    assert tok == "[EMAIL:1]"
    bind_token_map(tm)
    assert get_token_map() is tm
    assert restore_tokens("hi [EMAIL:1]") == "hi secret@corp.example"


def test_token_map_session_persists_to_disk(tmp_path: Path) -> None:
    slug = "tier3-smoke-session"
    tm = set_token_map_session(slug, tool_root=tmp_path)
    tm.token_for("jane@acme.com", "EMAIL")
    expected_path = tmp_path / "__orchestrator_sessions__" / "anon_maps" / f"{slug}.json"
    assert expected_path.is_file()

    clear_token_map()
    tm2 = set_token_map_session(slug, tool_root=tmp_path)
    assert tm2.restore("[EMAIL:1]") == "jane@acme.com"


# --- Tool-result scrubbing ----------------------------------------------------


def test_redact_tool_result_for_cloud_default_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.delenv("AGENTIC_ANONYMIZE_TOOL_RESULTS", raising=False)
    out = redact_tool_result_for_cloud("page mentions jane@acme.com")
    assert "jane@acme.com" not in out
    assert "[EMAIL" in out


def test_redact_tool_result_for_cloud_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_TOOL_RESULTS", "0")
    raw = "page mentions jane@acme.com"
    assert redact_tool_result_for_cloud(raw) == raw


def test_redact_tool_result_for_cloud_noop_when_anonymize_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_TOOL_RESULTS", "1")
    raw = "page mentions jane@acme.com"
    assert redact_tool_result_for_cloud(raw) == raw


def test_step_context_scrubs_prior_output(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.step_context import prepare_step_description

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.delenv("AGENTIC_ANONYMIZE_TOOL_RESULTS", raising=False)
    out = prepare_step_description("Write a summary.", "Found contact jane@acme.com in the doc.")
    assert "jane@acme.com" not in out
    assert "[EMAIL" in out


def test_fetch_url_tool_scrubs_result(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.fetch_url_tool import _html_to_plain_text
    from orchestration.cloud_anonymize import redact_tool_result_for_cloud

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.delenv("AGENTIC_ANONYMIZE_TOOL_RESULTS", raising=False)
    plain = _html_to_plain_text("<p>Contact jane@acme.com for details.</p>", max_chars=500)
    out = redact_tool_result_for_cloud(plain)
    assert "jane@acme.com" not in out
    assert "[EMAIL" in out


# --- Optional Presidio NER ----------------------------------------------------


def test_ner_noop_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_NER", "0")
    text = "John Smith lives in Paris."
    assert apply_ner_redaction(text) == text


def test_ner_soft_missing_dependency_warns_once(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    if presidio_available():
        pytest.skip("presidio-analyzer is installed in this environment")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_NER", "1")
    text = "John Smith lives in Paris."
    out = apply_ner_redaction(text)
    assert out == text  # never crashes, never half-redacts
    err = capsys.readouterr().err
    assert "presidio" in err.lower()


def test_ner_redacts_when_available(monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("presidio_analyzer")
    if not presidio_available():
        pytest.skip("Presidio AnalyzerEngine could not initialize (e.g. missing spaCy model)")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_NER", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "1")
    out = redact_for_cloud("John Smith works in Paris.", force=True)
    assert "John Smith" not in out
    assert "PERSON" in out


# --- Vision local preference --------------------------------------------------


def test_vision_model_prefers_local_when_cloud_planned(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.video_vision_synopsis import resolve_vision_model_for_anonymize

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.delenv("AGENTIC_ANONYMIZE_VISION_LOCAL", raising=False)
    monkeypatch.delenv("AGENTIC_ANONYMIZE_VISION_MODEL", raising=False)
    model, is_local_fallback = resolve_vision_model_for_anonymize("openai/gpt-4o-mini")
    assert model == "ollama/llava"
    assert is_local_fallback is True


def test_vision_model_respects_custom_env(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.video_vision_synopsis import resolve_vision_model_for_anonymize

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_VISION_MODEL", "bakllava")
    model, is_local_fallback = resolve_vision_model_for_anonymize("openai/gpt-4o-mini")
    assert model == "ollama/bakllava"
    assert is_local_fallback is True


def test_vision_model_unchanged_when_vision_local_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.video_vision_synopsis import resolve_vision_model_for_anonymize

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_VISION_LOCAL", "0")
    model, is_local_fallback = resolve_vision_model_for_anonymize("openai/gpt-4o-mini")
    assert model == "openai/gpt-4o-mini"
    assert is_local_fallback is False


def test_vision_model_unchanged_for_already_local_model(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.video_vision_synopsis import resolve_vision_model_for_anonymize

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    model, is_local_fallback = resolve_vision_model_for_anonymize("ollama/llava")
    assert model == "ollama/llava"
    assert is_local_fallback is False


def test_vision_model_unchanged_when_anonymize_off(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.video_vision_synopsis import resolve_vision_model_for_anonymize

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")
    model, is_local_fallback = resolve_vision_model_for_anonymize("openai/gpt-4o-mini")
    assert model == "openai/gpt-4o-mini"
    assert is_local_fallback is False
