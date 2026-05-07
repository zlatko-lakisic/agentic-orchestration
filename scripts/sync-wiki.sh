#!/usr/bin/env bash
set -euo pipefail

# Auto-sync the sibling wiki git repository:
# - optional pull/rebase
# - auto-commit local changes
# - push to origin
#
# Environment overrides:
#   WIKI_DIR               default: ../agentic-orchestration.wiki
#   WIKI_SYNC_BRANCH       default: current branch
#   WIKI_SYNC_PULL         default: 1 (pull --rebase before push)
#   WIKI_SYNC_PUSH         default: 1
#   WIKI_SYNC_COMMIT_MSG   default: "docs(wiki): automated sync"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/.." && pwd)"
wiki_dir="${WIKI_DIR:-"$repo_root/../agentic-orchestration.wiki"}"

if [[ ! -d "$wiki_dir/.git" ]]; then
  echo "[wiki-sync] not a git repo: $wiki_dir" >&2
  exit 1
fi

cd "$wiki_dir"

branch="${WIKI_SYNC_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
do_pull="${WIKI_SYNC_PULL:-1}"
do_push="${WIKI_SYNC_PUSH:-1}"
base_msg="${WIKI_SYNC_COMMIT_MSG:-docs(wiki): automated sync}"
stamp="$(date -u +'%Y-%m-%d %H:%M:%S UTC')"
msg="$base_msg ($stamp)"

echo "[wiki-sync] repo=$wiki_dir branch=$branch"

if [[ "$do_pull" == "1" ]]; then
  git fetch origin "$branch"
  git pull --rebase origin "$branch"
fi

git add -A

if git diff --cached --quiet; then
  echo "[wiki-sync] no local changes to commit."
else
  git commit -m "$msg"
  echo "[wiki-sync] committed local wiki changes."
fi

if [[ "$do_push" == "1" ]]; then
  git push origin "$branch"
  echo "[wiki-sync] pushed to origin/$branch"
fi

