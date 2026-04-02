#!/usr/bin/env bash
set -euo pipefail

VISIBILITY="${VISIBILITY:-private}"   # private|public
REPO_NAME="${REPO_NAME:-}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"       # 1 to allow dirty tree
AUTO_COMMIT="${AUTO_COMMIT:-0}"       # 1 to auto-commit
COMMIT_MESSAGE="${COMMIT_MESSAGE:-Publish project}"
SKIP_PUSH="${SKIP_PUSH:-0}"           # 1 to skip push
PUBLISH_WIKI="${PUBLISH_WIKI:-1}"     # 1 to publish sibling wiki repo
WIKI_DIR="${WIKI_DIR:-../agentic-orchestration.wiki}"
WIKI_BRANCH="${WIKI_BRANCH:-main}"
WIKI_AUTO_COMMIT="${WIKI_AUTO_COMMIT:-1}"  # 1 to auto-commit wiki changes
WIKI_COMMIT_MESSAGE="${WIKI_COMMIT_MESSAGE:-Update wiki}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
need git
need gh

load_root_env() {
  local envfile=".env"
  [[ -f "$envfile" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    [[ "${line:0:1}" == "#" ]] && continue
    if [[ "$line" != *"="* ]]; then
      continue
    fi
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "$key" | xargs)"
    val="$(echo "$val" | xargs)"
    [[ -z "$key" ]] && continue
    if [[ -z "${!key:-}" ]]; then
      export "$key=$val"
    fi
  done <"$envfile"
}

top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$top" ]]; then
  echo "Not a git repository (run from inside your repo)." >&2
  exit 1
fi
cd "$top"
echo "Repo root: $top"

load_root_env

# Allow script defaults from root .env (no effect on tool/web).
if [[ -z "$REPO_NAME" ]]; then
  REPO_NAME="${GITHUB_REPO_NAME:-${AGENTIC_GITHUB_REPO_NAME:-}}"
fi
if [[ "$VISIBILITY" == "private" && -n "${GITHUB_VISIBILITY:-}" ]]; then
  VISIBILITY="$GITHUB_VISIBILITY"
fi
if [[ "$COMMIT_MESSAGE" == "Publish project" && -n "${GITHUB_COMMIT_MESSAGE:-}" ]]; then
  COMMIT_MESSAGE="$GITHUB_COMMIT_MESSAGE"
fi
if [[ "$ALLOW_DIRTY" == "0" && "${GITHUB_ALLOW_DIRTY:-}" == "1" ]]; then
  ALLOW_DIRTY="1"
fi
if [[ "$AUTO_COMMIT" == "0" && "${GITHUB_AUTO_COMMIT:-}" == "1" ]]; then
  AUTO_COMMIT="1"
fi
if [[ "$SKIP_PUSH" == "0" && "${GITHUB_SKIP_PUSH:-}" == "1" ]]; then
  SKIP_PUSH="1"
fi
if [[ "$PUBLISH_WIKI" == "1" && -n "${GITHUB_PUBLISH_WIKI:-}" ]]; then
  case "${GITHUB_PUBLISH_WIKI,,}" in
    0|false|no|off) PUBLISH_WIKI="0" ;;
    *) PUBLISH_WIKI="1" ;;
  esac
fi
if [[ "$WIKI_DIR" == "../agentic-orchestration.wiki" && -n "${GITHUB_WIKI_DIR:-}" ]]; then
  WIKI_DIR="$GITHUB_WIKI_DIR"
fi
if [[ "$WIKI_BRANCH" == "main" && -n "${GITHUB_WIKI_BRANCH:-}" ]]; then
  WIKI_BRANCH="$GITHUB_WIKI_BRANCH"
fi
if [[ "$WIKI_AUTO_COMMIT" == "1" && -n "${GITHUB_WIKI_AUTO_COMMIT:-}" ]]; then
  case "${GITHUB_WIKI_AUTO_COMMIT,,}" in
    0|false|no|off) WIKI_AUTO_COMMIT="0" ;;
    *) WIKI_AUTO_COMMIT="1" ;;
  esac
fi
if [[ "$WIKI_COMMIT_MESSAGE" == "Update wiki" && -n "${GITHUB_WIKI_COMMIT_MESSAGE:-}" ]]; then
  WIKI_COMMIT_MESSAGE="$GITHUB_WIKI_COMMIT_MESSAGE"
fi
# GitHub wiki clone URL; set GITHUB_WIKI_GIT_URL in .env to override.
if [[ -z "${GITHUB_WIKI_GIT_URL:-}" ]]; then
  GITHUB_WIKI_GIT_URL="https://github.com/zlatko-lakisic/agentic-orchestration.wiki.git"
fi

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

github_remote="github"
gh_owner="$(gh api user -q .login)"
if [[ -z "$gh_owner" ]]; then
  echo "Could not resolve GitHub username. Run: gh auth login" >&2
  exit 1
fi
github_url="https://github.com/${gh_owner}/${REPO_NAME}.git"

set +e
out="$(gh repo create "$REPO_NAME" --source . --"$VISIBILITY" --remote "$github_remote" 2>&1)"
code=$?
set -e
if [[ "$code" -ne 0 ]]; then
  if echo "$out" | grep -qiE 'already exists|Name already exists'; then
    echo "GitHub repo already exists; ensuring git remote '$github_remote' points at GitHub."
    if git remote | grep -qx "$github_remote"; then
      git remote set-url "$github_remote" "$github_url"
    else
      git remote add "$github_remote" "$github_url"
    fi
  else
    echo "gh repo create failed: $out" >&2
    exit 1
  fi
fi

if [[ "$SKIP_PUSH" != "1" ]]; then
  git push -u "$github_remote" "$branch"
  echo
  echo "Done. Open the repo with: gh repo view $REPO_NAME --web"
else
  echo "Repo created and remote set, push skipped."
fi

if [[ "$PUBLISH_WIKI" == "1" ]]; then
  wiki_path="$(cd "$top" && cd "$WIKI_DIR" 2>/dev/null && pwd -P || true)"
  if [[ -z "$wiki_path" ]]; then
    echo "Wiki directory not found ($WIKI_DIR). Skipping wiki publish."
    exit 0
  fi
  if [[ ! -d "$wiki_path/.git" ]]; then
    echo "Wiki directory is not a git repository ($wiki_path). Skipping wiki publish."
    exit 0
  fi
  echo
  echo "Publishing wiki repo: $wiki_path"
  github_wiki_url="$GITHUB_WIKI_GIT_URL"
  (
    cd "$wiki_path"
    wiki_dirty="$(git status --porcelain || true)"
    if [[ -n "$wiki_dirty" ]]; then
      if [[ "$WIKI_AUTO_COMMIT" == "1" ]]; then
        git add -A
        git commit -m "$WIKI_COMMIT_MESSAGE"
      else
        echo "Wiki has uncommitted changes and WIKI_AUTO_COMMIT=0. Skipping wiki push."
        exit 0
      fi
    fi
    if git remote | grep -qx github; then
      git remote set-url github "$github_wiki_url"
    else
      git remote add github "$github_wiki_url"
    fi
    # GitHub wiki history is unrelated to GitLab/local if pages were created on github.com; use --force.
    echo "Force-pushing wiki to GitHub (overwrites remote branch history there)."
    git push --force -u github "$WIKI_BRANCH"
  )
fi

