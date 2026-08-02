"""Keep CrewAI non-interactive in daemon / headless paths.

CrewAI's first-time tracing flow can block on a 20s stdin prompt
(``Would you like to view your execution traces?``) after a crew finishes.
That stalls ``direct_agent`` and other HTTP/WS handlers when there is no TTY.

Call :func:`configure_crewai_noninteractive` once at engine serve startup.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_CONFIGURED = False


def configure_crewai_noninteractive(*, force: bool = False) -> dict[str, Any]:
    """Disable interactive CrewAI tracing prompts for this process.

    - Sets ``CREWAI_TESTING=true`` so CrewAI skips auto-collect + view prompts
      (env-based; works across threads / ContextVars).
    - Sets ``CREWAI_TRACING_ENABLED=false`` unless already set.
    - Calls ``set_suppress_tracing_messages(True)`` when CrewAI is importable.
    - Persists declined consent via ``mark_first_execution_done`` when available.

    Idempotent unless ``force=True``.
    """
    global _CONFIGURED
    if _CONFIGURED and not force:
        return {"configured": True, "idempotent": True}

    testing_before = os.environ.get("CREWAI_TESTING", "")
    os.environ["CREWAI_TESTING"] = "true"
    tracing_before = os.environ.get("CREWAI_TRACING_ENABLED", "")
    if not tracing_before.strip():
        os.environ["CREWAI_TRACING_ENABLED"] = "false"

    result: dict[str, Any] = {
        "configured": True,
        "crewai_testing": True,
        "crewai_testing_was": testing_before or None,
        "crewai_tracing_enabled": os.environ.get("CREWAI_TRACING_ENABLED"),
        "suppress_messages": False,
        "first_execution_marked": False,
    }

    try:
        from crewai.events.listeners.tracing.utils import (
            mark_first_execution_done,
            set_suppress_tracing_messages,
        )

        set_suppress_tracing_messages(True)
        result["suppress_messages"] = True
        try:
            mark_first_execution_done(user_consented=False)
            result["first_execution_marked"] = True
        except Exception as exc:  # noqa: BLE001 — preference write is best-effort
            result["first_execution_error"] = str(exc)
            logger.debug("crewai mark_first_execution_done failed: %s", exc)
    except ImportError:
        result["crewai_import"] = False
        logger.debug("crewai not importable; env-only noninteractive config applied")
    except Exception as exc:  # noqa: BLE001
        result["crewai_error"] = str(exc)
        logger.warning("crewai noninteractive configure partial failure: %s", exc)

    _CONFIGURED = True
    logger.info(
        "CrewAI noninteractive: CREWAI_TESTING=true tracing=%s suppress=%s marked=%s",
        result.get("crewai_tracing_enabled"),
        result.get("suppress_messages"),
        result.get("first_execution_marked"),
    )
    return result
