#!/usr/bin/env bash
# Bundle TokenSmith backend + standalone CPython into resources/, build the Vite app,
# and produce a macOS .dmg via electron-builder.
#
# Usage (from repo root):
#   bash scripts/package-mac.sh              # all steps
#   bash scripts/package-mac.sh backend      # clone backend only
#   bash scripts/package-mac.sh python       # download/extract standalone Python only
#   bash scripts/package-mac.sh deps         # pip install + import smoke test
#   bash scripts/package-mac.sh frontend     # npm run build:desktop
#   bash scripts/package-mac.sh dmg          # electron-builder (needs prior steps)
#
# Optional env:
#   TOKENSMITH_PYTHON_STANDALONE_URL — override download URL for install_only tarball
#   TOKENSMITH_SKIP_PYTHON_DOWNLOAD=1 — use TOKENSMITH_HOST_PYTHON (default python3.12) to populate resources/python

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STEP="${1:-all}"

RES="$ROOT/resources"
PY_DEST="$RES/python"
BACKEND_DEST="$RES/backend"

# astral-sh/python-build-standalone — update tag + filenames when bumping Python.
PBS_RELEASE="${TOKENSMITH_PBS_RELEASE:-20260303}"
PBS_PY_TAG="3.12.13+${PBS_RELEASE}"

die() {
  echo "error: $*" >&2
  exit 1
}

detect_arch() {
  local m
  m="$(uname -m)"
  case "$m" in
    arm64) echo "aarch64" ;;
    x86_64) echo "x86_64" ;;
    *) die "unsupported machine: $m" ;;
  esac
}

resolve_pybin() {
  local d="$1"
  local c
  for c in "$d/bin/python3.12" "$d/bin/python3" "$d/bin/python"; do
    if [[ -x "$c" ]]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

step_python() {
  mkdir -p "$RES"
  if [[ "${TOKENSMITH_SKIP_PYTHON_DOWNLOAD:-}" == "1" ]]; then
    local host="${TOKENSMITH_HOST_PYTHON:-python3.12}"
    echo "==> python: venv from host ($host) → $PY_DEST (TOKENSMITH_SKIP_PYTHON_DOWNLOAD=1)"
    command -v "$host" >/dev/null 2>&1 || die "host python not found: $host"
    rm -rf "$PY_DEST"
    "$host" -m venv "$PY_DEST"
  else
    local arch triple url
    arch="$(detect_arch)"
    triple="${arch}-apple-darwin"
    url="${TOKENSMITH_PYTHON_STANDALONE_URL:-https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_RELEASE}/cpython-${PBS_PY_TAG}-${triple}-install_only.tar.gz}"
    echo "==> python: fetching standalone ($triple)"
    echo "    $url"
    rm -rf "$PY_DEST"
    local tmp="$RES/.python_extract.$$"
    rm -rf "$tmp"
    mkdir -p "$tmp"
    curl -fsSL "$url" -o "$tmp/cpython.tar.gz"
    tar -xzf "$tmp/cpython.tar.gz" -C "$tmp"
    if [[ -d "$tmp/python" ]]; then
      mv "$tmp/python" "$PY_DEST"
    else
      die "unexpected tarball layout under $tmp (expected top-level python/)"
    fi
    rm -rf "$tmp"
  fi

  local pybin
  pybin="$(resolve_pybin "$PY_DEST")" || die "no python binary under $PY_DEST/bin"
  echo "==> python: ok ($pybin)"
}

step_backend() {
  bash "$ROOT/scripts/setup-backend.sh" clone
}

step_deps() {
  [[ -d "$PY_DEST" ]] || die "run: bash scripts/package-mac.sh python"
  bash "$ROOT/scripts/setup-backend.sh" deps
}

step_frontend() {
  echo "==> frontend: npm run build:desktop"
  npm run build:desktop
}

step_dmg() {
  test -d "$PY_DEST/bin" || die "missing $PY_DEST — run python + deps steps"
  test -f "$BACKEND_DEST/src/api_server.py" || die "missing backend — run backend step"
  command -v npx >/dev/null 2>&1 || die "npx not found"
  echo "==> dmg: electron-builder"
  npx electron-builder --mac dmg
}

case "$STEP" in
  all)
    step_backend
    step_python
    step_deps
    step_frontend
    step_dmg
    ;;
  backend) step_backend ;;
  python) step_python ;;
  deps) step_deps ;;
  frontend) step_frontend ;;
  dmg) step_dmg ;;
  -h|--help)
    sed -n '1,25p' "$0"
    ;;
  *)
    die "unknown step: $STEP (use all|backend|python|deps|frontend|dmg)"
    ;;
esac

echo "done ($STEP)."
