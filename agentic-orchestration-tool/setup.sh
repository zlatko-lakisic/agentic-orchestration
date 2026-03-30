#!/usr/bin/env bash
# One-time setup: Python venv, dependencies, and .env from .env.example
# Run: chmod +x setup.sh && ./setup.sh

set -euo pipefail
cd "$(dirname "$0")"

echo "Creating virtual environment (.venv)..."
if command -v py >/dev/null 2>&1; then
  py -3.12 -m venv .venv
elif command -v python3.12 >/dev/null 2>&1; then
  python3.12 -m venv .venv
elif command -v python3 >/dev/null 2>&1; then
  python3 -m venv .venv
else
  echo "error: need Python 3.12 (py -3.12, python3.12, or python3)" >&2
  exit 1
fi

PYBIN="./.venv/bin/python"
if [[ ! -x "$PYBIN" ]]; then
  echo "error: failed to create .venv" >&2
  exit 1
fi

echo "Upgrading pip..."
"$PYBIN" -m pip install --upgrade pip

echo "Installing dependencies..."
"$PYBIN" -m pip install -r requirements.txt

if [[ ! -f .env ]] && [[ -f .env.example ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit OPENAI_API_KEY and Ollama vars."
else
  echo ".env already exists or .env.example missing — skipped copy."
fi

echo ""
echo "Setup finished. Next:"
echo "  source .venv/bin/activate"
echo "  export PYTHONUTF8=1   # optional"
echo "  python main.py"
