"""Guarded numeric environment parsing.

``int(os.getenv("NAME", "5"))`` raises ``ValueError`` when the variable is set
but empty (``NAME=`` copied from a ``.env`` template) or malformed, which turns a
harmless config typo into a failure of every run (or of ``--help`` when the
value is an argparse default). These helpers fall back to the default instead
and optionally clamp to a sane range.
"""

from __future__ import annotations

import os
import sys

_warned: set[str] = set()


def _warn_once(name: str, raw: str, default: object) -> None:
    if name in _warned:
        return
    _warned.add(name)
    print(
        f"warning: ignoring invalid {name}={raw!r}; using default {default!r}",
        file=sys.stderr,
    )


def env_int(
    name: str,
    default: int,
    *,
    lo: int | None = None,
    hi: int | None = None,
) -> int:
    """Integer env var; unset / empty / malformed → ``default``; clamped to ``[lo, hi]``."""
    raw = os.getenv(name)
    value = default
    if raw is not None and raw.strip():
        text = raw.strip()
        try:
            value = int(text)
        except ValueError:
            try:
                as_float = float(text)
                if as_float != as_float or as_float in (float("inf"), float("-inf")):
                    raise ValueError(text)
                value = int(as_float)
            except ValueError:
                _warn_once(name, raw, default)
                value = default
    if lo is not None:
        value = max(lo, value)
    if hi is not None:
        value = min(hi, value)
    return value


def env_float(
    name: str,
    default: float,
    *,
    lo: float | None = None,
    hi: float | None = None,
) -> float:
    """Float env var; unset / empty / malformed / NaN → ``default``; clamped to ``[lo, hi]``."""
    raw = os.getenv(name)
    value = default
    if raw is not None and raw.strip():
        try:
            parsed = float(raw.strip())
            if parsed != parsed:  # NaN
                raise ValueError(raw)
            value = parsed
        except ValueError:
            _warn_once(name, raw, default)
            value = default
    if lo is not None:
        value = max(lo, value)
    if hi is not None:
        value = min(hi, value)
    return value
