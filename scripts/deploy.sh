#!/usr/bin/env bash
#
# Build the frontend and publish dist/ to the `deploy` branch on origin.
# Target: GitHub Pages (deploy branch, root).
#
# Usage:
#   npm run deploy
#
# Env overrides:
#   DEPLOY_BRANCH      branch to publish to            (default: deploy)
#   DEPLOY_REMOTE      git remote name                 (default: origin)
#   VITE_API_BASE_URL  production API base             (default: https://api.conelp.kr/api)
#   ALLOW_DIRTY        set to 1 to skip clean-tree gate
#
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-deploy}"
REMOTE="${DEPLOY_REMOTE:-origin}"
API_BASE="${VITE_API_BASE_URL:-https://api.conelp.kr/api}"
WORKTREE_DIR=".deploy-worktree"

# --- repo root + sanity ---------------------------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SRC_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SRC_SHA="$(git rev-parse --short HEAD)"

if [[ "${ALLOW_DIRTY:-0}" != "1" && -n "$(git status --porcelain)" ]]; then
  echo "❌ working tree is dirty. commit/stash first, or rerun with ALLOW_DIRTY=1." >&2
  exit 1
fi

# --- cleanup hook ---------------------------------------------------------
cleanup() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    git worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || rm -rf "$WORKTREE_DIR"
  fi
}
trap cleanup EXIT

# --- build ----------------------------------------------------------------
echo "→ build (VITE_API_BASE_URL=$API_BASE)"
rm -rf dist
VITE_API_BASE_URL="$API_BASE" npm run build

# GitHub Pages helpers
touch dist/.nojekyll                  # bypass Jekyll on Pages
cp dist/index.html dist/404.html      # hash-mode safety net for direct URL hits
if [[ -f CNAME ]]; then cp CNAME dist/CNAME; fi

# --- prepare deploy worktree ---------------------------------------------
rm -rf "$WORKTREE_DIR"
git fetch "$REMOTE" "$BRANCH" 2>/dev/null || true

if git show-ref --verify --quiet "refs/remotes/$REMOTE/$BRANCH"; then
  echo "→ checkout $REMOTE/$BRANCH into $WORKTREE_DIR"
  git worktree add -B "$BRANCH" "$WORKTREE_DIR" "refs/remotes/$REMOTE/$BRANCH"
else
  echo "→ first deploy. creating orphan branch $BRANCH"
  git worktree add --detach "$WORKTREE_DIR" HEAD
  ( cd "$WORKTREE_DIR" && git checkout --orphan "$BRANCH" )
fi

# wipe everything except .git
find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# copy build output (includes dotfiles)
cp -R dist/. "$WORKTREE_DIR"/

# --- commit + push --------------------------------------------------------
pushd "$WORKTREE_DIR" >/dev/null
git add -A
if git diff --cached --quiet; then
  echo "→ no changes to publish. skip push."
else
  git commit -m "deploy: ${SRC_BRANCH}@${SRC_SHA}"
  git push "$REMOTE" "$BRANCH"
  echo "✅ pushed ${SRC_BRANCH}@${SRC_SHA} → ${REMOTE}/${BRANCH}"
fi
popd >/dev/null
