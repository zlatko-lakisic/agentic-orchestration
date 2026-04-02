#!/usr/bin/env bash
set -euo pipefail

VISIBILITY="${VISIBILITY:-private}"   # private|public
REPO_NAME="${REPO_NAME:-}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"       # 1 to allow dirty tree
AUTO_COMMIT="${AUTO_COMMIT:-0}"       # 1 to auto-commit
COMMIT_MESSAGE="${COMMIT_MESSAGE:-Publish project}"
SKIP_PUSH="${SKIP_PUSH:-0}"           # 1 to skip push

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
need git
need gh

top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$top" ]]; then
  echo "Not a git repository (run from inside your repo)." >&2
  exit 1
fi
cd "$top"
echo "Repo root: $top"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

dirty="$(git status --porcelain || true)"
if [[ -n "$dirty" && "$ALLOW_DIRTY" != "1" ]]; then
  if [[ "$AUTO_COMMIT" == "1" ]]; then
    git add -A
    git commit -m "$COMMIT_MESSAGE"
  else
    echo "Working tree is not clean. Commit/stash changes, or set ALLOW_DIRTY=1 or AUTO_COMMIT=1." >&2
    exit 1
  fi
fi

if [[ -z "$REPO_NAME" ]]; then
  read -r -p "GitHub repo name (e.g. agentic-orchestration): " REPO_NAME
fi
if [[ -z "$REPO_NAME" ]]; then
  echo "REPO_NAME is required." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
echo
echo "About to create and publish:"
echo "- name: $REPO_NAME"
echo "- visibility: $VISIBILITY"
echo "- branch: $branch"
echo "- skip push: $SKIP_PUSH"
echo
read -r -p "Proceed? (y/N): " ok
if [[ "${ok,,}" != "y" ]]; then
  echo "Cancelled."
  exit 0
fi

gh repo create "$REPO_NAME" --source . --"$VISIBILITY" --remote origin

if [[ "$SKIP_PUSH" != "1" ]]; then
  git push -u origin "$branch"
  echo
  echo "Done. Open the repo with: gh repo view --web"
else
  echo "Repo created and remote set, push skipped."
fi

