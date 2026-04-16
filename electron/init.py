#!/usr/bin/env python3
"""
First-run bootstrap for TokenSmith when driven from the Electron app.

Creates/uses the conda env, installs Python dependencies, downloads GGUF models
referenced in config/config.yaml, and writes a marker file when finished.

Intended to be copied into the TokenSmith backend repository later; keep paths
relative to --backend-root only.

NOTE: This script is specific for Apple Silicon based Mac.

Logging: logger name ``tokensmith.init``. Default file log at
``<backend-root>/logs/tokensmith-electron-init.log`` (append mode). Set
``TOKENSMITH_INIT_LOG=0`` to disable file logging. Use ``-v`` for DEBUG on stdout.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

_LOG = logging.getLogger("tokensmith.init")

# Bump when install steps change so Electron can re-run init.
DEFAULT_INIT_MARKER_VERSION = "1"

# Known GGUF locations on Hugging Face (filename -> repo_id, remote_name).
HF_GGUF_ALIASES: dict[str, tuple[str, str]] = {
    "Qwen3-Embedding-4B-Q5_K_M.gguf": (
        "Qwen/Qwen3-Embedding-4B-GGUF",
        "Qwen3-Embedding-4B-Q5_K_M.gguf",
    ),
    "qwen2.5-3b-instruct-q8_0.gguf": (
        "Qwen/Qwen2.5-3B-Instruct-GGUF",
        "qwen2.5-3b-instruct-q8_0.gguf",
    ),
    "qwen2.5-1.5b-instruct-q5_k_m.gguf": (
        "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "qwen2.5-1.5b-instruct-q5_k_m.gguf",
    ),
    "qwen2.5-0.5b-instruct-q5_k_m.gguf": (
        "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    ),
}

# Mirrors TokenSmith environment.yml pip section (faiss via conda; llama-cpp installed last).
LOG_ENV_FILE = "TOKENSMITH_INIT_LOG"


def setup_logging(log_file: Path | None, *, verbose: bool) -> None:
    """Console + optional file; call once at startup."""
    log = logging.getLogger("tokensmith.init")
    log.handlers.clear()
    log.setLevel(logging.DEBUG if verbose else logging.INFO)

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    stdout = logging.StreamHandler(sys.stdout)
    stdout.setLevel(logging.DEBUG if verbose else logging.INFO)
    stdout.setFormatter(fmt)
    log.addHandler(stdout)

    if log_file is not None:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file, encoding="utf-8", mode="a")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(fmt)
        log.addHandler(fh)

    log.propagate = False


def default_log_path(backend_root: Path) -> Path:
    return backend_root / "logs" / "tokensmith-electron-init.log"


PIP_DEPENDENCIES = [
    "nltk",
    "transformers",
    "sentence-transformers",
    "rank_bm25",
    "langchain",
    "langchain_text_splitters",
    "google-genai",
    "rich",
    "langchain-text-splitters",
    "fastapi",
    "uvicorn[standard]",
    "pydantic",
    "docling",
    "markdown",
    "pytest",
]


def run(cmd: list[str], *, env: dict[str, str] | None = None, cwd: Path | None = None) -> None:
    _LOG.info("run: %s", " ".join(cmd))
    subprocess.run(cmd, check=True, env=env, cwd=cwd)


def run_optional(cmd: list[str], *, env: dict[str, str] | None = None, cwd: Path | None = None) -> bool:
    _LOG.info("run (optional): %s", " ".join(cmd))
    r = subprocess.run(cmd, env=env, cwd=cwd)
    if r.returncode != 0:
        _LOG.warning("command exited with code %s", r.returncode)
    return r.returncode == 0


def which_conda() -> str:
    c = os.environ.get("TOKENSMITH_CONDA") or shutil.which("conda")
    if not c:
        _LOG.error("conda not found on PATH (set TOKENSMITH_CONDA to the conda binary).")
        sys.exit(1)
    _LOG.info("using conda at %s", c)
    return c


def conda_env_exists(conda: str, name: str) -> bool:
    r = subprocess.run(
        [conda, "env", "list", "--json"],
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0:
        return False
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return False
    for p in data.get("envs", []):
        if Path(p).name == name:
            return True
    return False


def ensure_conda_env(conda: str, env_name: str) -> None:
    if conda_env_exists(conda, env_name):
        _LOG.info("conda env %r already exists", env_name)
        return
    _LOG.info("creating conda env %r (python 3.12)", env_name)
    run([conda, "create", "-n", env_name, "python=3.12", "pip", "-y"])


def conda_run_cmd(conda: str, env_name: str, inner: list[str]) -> list[str]:
    # --no-capture-output: show pip/build logs in the terminal immediately
    return [conda, "run", "--no-capture-output", "-n", env_name, *inner]


def conda_run(conda: str, env_name: str, cmd: list[str], *, cwd: Path | None = None) -> None:
    run(conda_run_cmd(conda, env_name, cmd), cwd=cwd)


def load_config_yaml(backend_root: Path) -> dict[str, Any]:
    import yaml  # after bootstrap pip

    cfg_path = backend_root / "config" / "config.yaml"
    if not cfg_path.is_file():
        return {}
    with cfg_path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, dict) else {}


def gguf_paths_from_config(cfg: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for key in ("embed_model", "gen_model", "model_path"):
        v = cfg.get(key)
        if isinstance(v, str) and v.strip().lower().endswith(".gguf"):
            out.append(v.strip())
    seen: set[str] = set()
    deduped: list[str] = []
    for p in out:
        if p not in seen:
            seen.add(p)
            deduped.append(p)
    return deduped


def download_gguf_models(backend_root: Path, conda: str, env_name: str) -> None:
    cfg = load_config_yaml(backend_root)
    rel_paths = gguf_paths_from_config(cfg)
    if not rel_paths:
        _LOG.info("no .gguf paths in config/config.yaml; skipping model download")
        return
    _LOG.info("gguf paths from config: %s", rel_paths)

    inner_py = r"""
import shutil, sys
from pathlib import Path
from huggingface_hub import hf_hub_download

backend_root = Path(sys.argv[1])
for spec in sys.argv[2:]:
    rel, repo, remote = spec.split("|", 2)
    dest = backend_root / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and dest.stat().st_size > 0:
        print("exists:", dest, flush=True)
        continue
    print("downloading", remote, "->", dest, flush=True)
    cached = hf_hub_download(repo_id=repo, filename=remote)
    shutil.copy2(cached, dest)
"""

    specs: list[str] = []
    for rel in rel_paths:
        name = Path(rel).name
        if name not in HF_GGUF_ALIASES:
            _LOG.warning(
                "no Hugging Face mapping for %r; download manually into %s",
                name,
                backend_root / rel,
            )
            continue
        repo, remote = HF_GGUF_ALIASES[name]
        specs.append(f"{rel}|{repo}|{remote}")

    if not specs:
        _LOG.info("no models to download after alias resolution")
        return

    _LOG.info("downloading %d model file(s) via huggingface_hub (child prints progress to stdout)", len(specs))
    run(
        conda_run_cmd(conda, env_name, ["python", "-c", inner_py, str(backend_root), *specs]),
        cwd=backend_root,
    )


def bootstrap_pip(backend_root: Path, conda: str, env_name: str) -> None:
    conda_run(
        conda,
        env_name,
        ["python", "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"],
        cwd=backend_root,
    )
    conda_run(
        conda,
        env_name,
        ["python", "-m", "pip", "install", "pyyaml", "huggingface_hub", "tqdm"],
        cwd=backend_root,
    )


def install_python_deps(backend_root: Path, conda: str, env_name: str) -> None:
    # FAISS: conda-forge build avoids common NumPy/OpenMP issues on Apple Silicon (per TokenSmith README).
    run_optional(
        [conda, "install", "-n", env_name, "-c", "conda-forge", "faiss-cpu", "-y"],
        cwd=backend_root,
    )

    conda_run(
        conda,
        env_name,
        ["python", "-m", "pip", "install", "-e", "."],
        cwd=backend_root,
    )

    conda_run(
        conda,
        env_name,
        ["python", "-m", "pip", "install", *PIP_DEPENDENCIES],
        cwd=backend_root,
    )

    # llama.cpp Python bindings: enable Metal on Apple Silicon when building from source.
    env = {**os.environ}
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        env["CMAKE_ARGS"] = (env.get("CMAKE_ARGS", "") + " -DLLAMA_METAL=on").strip()

    _LOG.info("pip install llama-cpp-python (CMAKE_ARGS may apply on Apple Silicon)")
    subprocess.run(
        conda_run_cmd(
            conda,
            env_name,
            [
                "python",
                "-m",
                "pip",
                "install",
                "--force-reinstall",
                "--no-cache-dir",
                "llama-cpp-python",
            ],
        ),
        check=True,
        cwd=backend_root,
        env=env,
    )


def write_marker(backend_root: Path, version: str) -> None:
    p = backend_root / ".tokensmith-electron-init"
    p.write_text(version.strip() + "\n", encoding="utf-8")
    _LOG.info("wrote init marker %s (%s)", p, version)


def main() -> None:
    parser = argparse.ArgumentParser(description="TokenSmith Electron first-run setup")
    parser.add_argument("--backend-root", type=Path, required=True)
    parser.add_argument("--conda-env", type=str, default="ts-ui")
    parser.add_argument("--init-marker-version", type=str, default=DEFAULT_INIT_MARKER_VERSION)
    parser.add_argument(
        "--log-file",
        type=Path,
        default=None,
        help="Append init logs here (default: <backend-root>/logs/tokensmith-electron-init.log). "
        "Set env TOKENSMITH_INIT_LOG=0 to disable file logging.",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="DEBUG on console")
    args = parser.parse_args()

    backend_root = args.backend_root.resolve()
    if not (backend_root / "pyproject.toml").is_file():
        logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
        logging.error("Invalid backend root (no pyproject.toml): %s", backend_root)
        sys.exit(1)

    log_file: Path | None
    if args.log_file is not None:
        log_file = args.log_file.resolve()
    elif os.environ.get(LOG_ENV_FILE, "").strip().lower() in ("0", "false", "no"):
        log_file = None
    else:
        log_file = default_log_path(backend_root)

    setup_logging(log_file, verbose=args.verbose)
    _LOG.info(
        "TokenSmith init starting backend_root=%s conda_env=%s marker_version=%s platform=%s/%s log_file=%s",
        backend_root,
        args.conda_env,
        args.init_marker_version,
        platform.system(),
        platform.machine(),
        log_file,
    )
    t0 = time.monotonic()

    try:
        conda = which_conda()
        ensure_conda_env(conda, args.conda_env)

        _LOG.info("phase=bootstrap_pip")
        t1 = time.monotonic()
        bootstrap_pip(backend_root, conda, args.conda_env)
        _LOG.debug("bootstrap_pip finished in %.1fs", time.monotonic() - t1)

        _LOG.info("phase=download_gguf_models")
        t1 = time.monotonic()
        download_gguf_models(backend_root, conda, args.conda_env)
        _LOG.debug("download_gguf_models finished in %.1fs", time.monotonic() - t1)

        _LOG.info("phase=install_python_deps")
        t1 = time.monotonic()
        install_python_deps(backend_root, conda, args.conda_env)
        _LOG.debug("install_python_deps finished in %.1fs", time.monotonic() - t1)

        write_marker(backend_root, args.init_marker_version)
    except subprocess.CalledProcessError as e:
        _LOG.exception("subprocess failed (returncode=%s cmd=%s)", e.returncode, e.cmd)
        sys.exit(e.returncode or 1)
    except Exception:
        _LOG.exception("init aborted")
        raise

    _LOG.info("TokenSmith init complete in %.1fs", time.monotonic() - t0)


if __name__ == "__main__":
    main()
