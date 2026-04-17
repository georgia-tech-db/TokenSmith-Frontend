#!/usr/bin/env bash
# TokenSmith-specific backend bootstrap for Electron packaging.
# - Clones backend into resources/backend
# - Installs backend Python dependencies into resources/python
# - Runs import smoke test for required modules
#
# Usage:
#   bash scripts/setup-backend.sh clone
#   bash scripts/setup-backend.sh deps
#   bash scripts/setup-backend.sh all

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RES="$ROOT/resources"
BACKEND_DEST="$RES/backend"
PY_DEST="$RES/python"
REQ="${TOKENSMITH_REQUIREMENTS:-$ROOT/requirements-electron.txt}"
BACKEND_URL="${TOKENSMITH_BACKEND_GIT_URL:-https://github.com/georgia-tech-db/TokenSmith.git}"
STEP="${1:-all}"

die() {
  echo "error: $*" >&2
  exit 1
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

clone_backend() {
  echo "==> setup-backend: clone TokenSmith backend"
  rm -rf "$BACKEND_DEST"
  mkdir -p "$RES"
  git clone --depth 1 "$BACKEND_URL" "$BACKEND_DEST"
  [[ -f "$BACKEND_DEST/src/api_server.py" ]] || die "clone missing src/api_server.py"
}

install_backend_deps() {
  local pybin
  pybin="$(resolve_pybin "$PY_DEST")" || die "missing python under $PY_DEST (run package-mac.sh python)"
  [[ -f "$REQ" ]] || die "missing requirements file: $REQ"

  echo "==> setup-backend: pip bootstrap"
  "$pybin" -m pip install --upgrade pip setuptools wheel

  if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    export CMAKE_ARGS="${CMAKE_ARGS:--DGGML_METAL=ON}"
    echo "==> setup-backend: CMAKE_ARGS=$CMAKE_ARGS"
  fi

  if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    echo "==> setup-backend: pip install -r ${REQ#$ROOT/} (metal wheel index)"
    "$pybin" -m pip install \
      --extra-index-url "https://abetlen.github.io/llama-cpp-python/whl/metal" \
      -r "$REQ" \
      --prefer-binary
  else
    echo "==> setup-backend: pip install -r ${REQ#$ROOT/}"
    "$pybin" -m pip install -r "$REQ" --prefer-binary
  fi

  echo "==> setup-backend: import smoke test"
  "$pybin" <<'PY'
import importlib

mods = [
    "faiss",
    "llama_cpp",
    "fastapi",
    "uvicorn",
    "yaml",
    "tqdm",
    "nltk",
    "transformers",
    "sentence_transformers",
    "rank_bm25",
    "langchain",
    "langchain_text_splitters",
    "google.genai",
    "rich",
    "pydantic",
    "docling",
    "markdown",
]
failed = []
for m in mods:
    try:
        importlib.import_module(m)
    except Exception as e:
        failed.append((m, e))
if failed:
    for m, e in failed:
        print(f"FAIL {m}: {e}")
    raise SystemExit(1)
print("import smoke test: ok")
PY
}

case "$STEP" in
  all)
    clone_backend
    install_backend_deps
    ;;
  clone)
    clone_backend
    ;;
  deps)
    install_backend_deps
    ;;
  *)
    die "unknown step: $STEP (use all|clone|deps)"
    ;;
esac
