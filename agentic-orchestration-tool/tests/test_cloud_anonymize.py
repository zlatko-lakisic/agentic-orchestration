"""Unit tests for cloud anonymization helpers."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.cloud_anonymize import (
    anonymize_cloud_enabled,
    cloud_provider_types,
    filter_catalog_to_local_providers,
    is_cloud_litellm_model,
    is_cloud_provider_type,
    maybe_redact_for_cloud_provider,
    redact_for_cloud,
    redact_messages_for_cloud,
    user_wants_local_only,
)


def test_redact_email_phone_ssn_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    raw = (
        "Contact jane.doe@acme.com or +1 (555) 123-4567. "
        "SSN 123-45-6789. Key sk-abcdefghijklmnopqrstuvwxyz012345."
    )
    out = redact_for_cloud(raw)
    assert "jane.doe@acme.com" not in out
    assert "[EMAIL]" in out
    assert "[PHONE]" in out
    assert "[SSN]" in out
    assert "[API_KEY]" in out
    assert "sk-abcdefghijklmnopqrstuvwxyz012345" not in out


def test_redact_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    raw = "email me at a@b.co"
    assert redact_for_cloud(raw) == raw
    assert redact_for_cloud(raw, force=True) == "email me at [EMAIL]"


def test_maybe_redact_skips_ollama(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    raw = "a@b.co"
    assert maybe_redact_for_cloud_provider(raw, provider_type="ollama") == raw
    assert maybe_redact_for_cloud_provider(raw, litellm_model="ollama/llama3.2") == raw
    assert maybe_redact_for_cloud_provider(raw, provider_type="openai") == "[EMAIL]"
    assert maybe_redact_for_cloud_provider(raw, litellm_model="gpt-4o-mini") == "[EMAIL]"


def test_cloud_provider_types_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_CLOUD_PROVIDER_TYPES", raising=False)
    assert "openai" in cloud_provider_types()
    monkeypatch.setenv("AGENTIC_CLOUD_PROVIDER_TYPES", "openai, custom_cloud")
    assert cloud_provider_types() == frozenset({"openai", "custom_cloud"})
    assert is_cloud_provider_type("custom_cloud")
    assert not is_cloud_provider_type("anthropic")


def test_is_cloud_litellm_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_CLOUD_PROVIDER_TYPES", raising=False)
    assert is_cloud_litellm_model("openai/gpt-4o")
    assert is_cloud_litellm_model("gpt-4o")  # bare → openai/
    assert not is_cloud_litellm_model("ollama/llama3.2")
    assert is_cloud_litellm_model("anthropic/claude-3-5-sonnet")


def test_user_wants_local_only() -> None:
    assert user_wants_local_only("run this offline please")
    assert user_wants_local_only("use ollama for this")
    assert user_wants_local_only("keep this private")
    assert user_wants_local_only("for privacy, use local models")
    assert not user_wants_local_only("summarize private equity trends")
    assert not user_wants_local_only("write a blog post about orchestration")


def test_filter_catalog_to_local_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_CLOUD_PROVIDER_TYPES", raising=False)
    entries = [
        {"id": "gpt", "type": "openai"},
        {"id": "local", "type": "ollama"},
        {"id": "claude", "type": "anthropic"},
    ]
    kept = filter_catalog_to_local_providers(entries)
    assert [e["id"] for e in kept] == ["local"]


def test_redact_messages_for_cloud(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    msgs = [{"role": "user", "content": "mail a@b.co"}]
    out = redact_messages_for_cloud(msgs, litellm_model="openai/gpt-4o-mini")
    assert out[0]["content"] == "mail [EMAIL]"
    assert msgs[0]["content"] == "mail a@b.co"  # original untouched
    local = redact_messages_for_cloud(msgs, litellm_model="ollama/llama3.2")
    assert local[0]["content"] == "mail a@b.co"


def test_anonymize_default_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_ANONYMIZE_CLOUD", raising=False)
    assert anonymize_cloud_enabled() is True


def test_custom_yaml_patterns(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.cloud_anonymize import (
        clear_custom_anonymize_pattern_cache,
        load_custom_anonymize_patterns,
    )

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    monkeypatch.delenv("AGENTIC_ANONYMIZE_PATTERNS_PATH", raising=False)
    cfg = tmp_path / "custom.yaml"
    cfg.write_text(
        "patterns:\n"
        "  - id: emp\n"
        "    pattern: '\\bEMP-\\d{6}\\b'\n"
        "    replacement: '[EMPLOYEE_ID]'\n"
        "  - id: ticket\n"
        "    pattern: '\\bTKT-\\d+\\b'\n"
        "    replacement: '[TICKET]'\n"
        "    flags: i\n"
        "  - id: off\n"
        "    pattern: 'NOPE'\n"
        "    enabled: false\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH", str(cfg))
    # Isolate from shipped empty patterns file by pointing primary at empty list file.
    primary = tmp_path / "primary.yaml"
    primary.write_text("patterns: []\n", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_PATTERNS_PATH", str(primary))
    clear_custom_anonymize_pattern_cache()
    loaded = load_custom_anonymize_patterns(force_reload=True)
    assert {p.id for p in loaded} == {"emp", "ticket"}
    out = redact_for_cloud("See EMP-123456 and tkt-99; email a@b.co")
    assert "[EMPLOYEE_ID]" in out
    assert "[TICKET]" in out
    assert "EMP-123456" not in out
    assert "[EMAIL]" in out
    clear_custom_anonymize_pattern_cache()


def test_invalid_custom_pattern_skipped(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    from orchestration.cloud_anonymize import clear_custom_anonymize_pattern_cache

    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_REVERSIBLE", "0")  # Tier 1+2 static placeholder check
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        "patterns:\n  - id: broken\n    pattern: '(unclosed'\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AGENTIC_ANONYMIZE_PATTERNS_PATH", str(bad))
    monkeypatch.delenv("AGENTIC_EXTRA_ANONYMIZE_PATTERNS_PATH", raising=False)
    clear_custom_anonymize_pattern_cache()
    # Should not raise — warning on stderr, builtins still work.
    assert redact_for_cloud("a@b.co") == "[EMAIL]"
    err = capsys.readouterr().err
    assert "skipping custom patterns" in err
    clear_custom_anonymize_pattern_cache()
