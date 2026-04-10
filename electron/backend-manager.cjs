/**
 * Manages the TokenSmith Python API as a child process for the Electron app.
 *
 * Environment (optional):
 * - TOKENSMITH_SKIP_MANAGED_BACKEND=1 — do not clone, init, or start the backend
 * - TOKENSMITH_BACKEND_GIT_URL — git remote (default: georgia-tech-db/TokenSmith)
 * - TOKENSMITH_BACKEND_PATH — use this repo directory; skip clone
 * - TOKENSMITH_CONDA_ENV — conda environment name (default: ts-ui)
 * - TOKENSMITH_CONDA — path to conda executable if not on PATH
 * - TOKENSMITH_PYTHON — if set, run uvicorn with this Python directly (skips conda run)
 * - TOKENSMITH_API_PORT — API port (default: 8000)
 * - TOKENSMITH_FORCE_INIT=1 — re-run electron/init.py even if marker exists
 *
 * First run: runs electron/init.py inside the conda env (deps + model download). Bump
 * INIT_MARKER_VERSION below when init steps change.
 */

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const DEFAULT_GIT_URL = 'https://github.com/georgia-tech-db/TokenSmith.git';
/** Increment to force re-running init.py for existing installs */
const INIT_MARKER_VERSION = '1';

const INIT_MARKER_FILENAME = '.tokensmith-electron-init';

let backendChild = null;

function skipManagedBackend() {
  return (
    process.env.TOKENSMITH_SKIP_MANAGED_BACKEND === '1' ||
    process.env.TOKENSMITH_SKIP_MANAGED_BACKEND === 'true'
  );
}

function getApiPort() {
  const p = process.env.TOKENSMITH_API_PORT || '8000';
  const n = parseInt(p, 10);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

function getCondaEnv() {
  return process.env.TOKENSMITH_CONDA_ENV || 'ts-ui';
}

function getCondaExecutable() {
  return process.env.TOKENSMITH_CONDA || 'conda';
}

function getBackendRoot(app) {
  if (process.env.TOKENSMITH_BACKEND_PATH) {
    return path.resolve(process.env.TOKENSMITH_BACKEND_PATH);
  }
  return path.join(app.getPath('userData'), 'TokenSmith');
}

function getGitUrl() {
  return process.env.TOKENSMITH_BACKEND_GIT_URL || DEFAULT_GIT_URL;
}

function apiServerPath(backendRoot) {
  return path.join(backendRoot, 'src', 'api_server.py');
}

function isRepoPresent(backendRoot) {
  return fs.existsSync(apiServerPath(backendRoot));
}

function initMarkerPath(backendRoot) {
  return path.join(backendRoot, INIT_MARKER_FILENAME);
}

async function readInitMarker(backendRoot) {
  try {
    const v = await fs.promises.readFile(initMarkerPath(backendRoot), 'utf8');
    return v.trim();
  } catch {
    return '';
  }
}

async function ensureClone(backendRoot, gitUrl) {
  if (isRepoPresent(backendRoot)) {
    return;
  }
  const parent = path.dirname(backendRoot);
  await fs.promises.mkdir(parent, { recursive: true });

  if (fs.existsSync(backendRoot)) {
    const entries = await fs.promises.readdir(backendRoot);
    if (entries.length > 0) {
      throw new Error(
        `Backend path "${backendRoot}" exists but is not a valid TokenSmith checkout (missing src/api_server.py).`
      );
    }
  }

  await execFileAsync('git', ['clone', '--depth', '1', gitUrl, backendRoot], {
    env: process.env,
  });
}

async function ensureCondaEnvExists(conda, envName) {
  try {
    await execFileAsync(conda, ['create', '-n', envName, 'python=3.12', 'pip', '-y'], {
      env: process.env,
    });
  } catch {
    /* environment may already exist */
  }
}

async function runInitIfNeeded(backendRoot) {
  if (process.env.TOKENSMITH_FORCE_INIT === '1' || process.env.TOKENSMITH_FORCE_INIT === 'true') {
    try {
      await fs.promises.unlink(initMarkerPath(backendRoot));
    } catch {
      /* no marker */
    }
  }

  const marker = await readInitMarker(backendRoot);
  if (marker === INIT_MARKER_VERSION) {
    return;
  }

  const conda = getCondaExecutable();
  const condaEnv = getCondaEnv();
  const initScript = path.join(__dirname, 'init.py');

  console.log(
    `[TokenSmith backend] First-time setup (conda env "${condaEnv}", marker ${marker || 'missing'})…`
  );

  await ensureCondaEnvExists(conda, condaEnv);

  const initEnv = {
    ...process.env,
    TOKENSMITH_CONDA: conda,
  };

  await execFileAsync(
    conda,
    [
      'run',
      '--no-capture-output',
      '-n',
      condaEnv,
      'python',
      initScript,
      '--backend-root',
      backendRoot,
      '--conda-env',
      condaEnv,
      '--init-marker-version',
      INIT_MARKER_VERSION,
    ],
    {
      env: initEnv,
      stdio: 'inherit',
    }
  );
}

function spawnBackend(backendRoot, port) {
  const condaEnv = getCondaEnv();
  const conda = getCondaExecutable();

  if (process.env.TOKENSMITH_PYTHON) {
    const py = process.env.TOKENSMITH_PYTHON;
    const args = [
      '-m',
      'uvicorn',
      'src.api_server:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ];
    return spawn(py, args, {
      cwd: backendRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: 'inherit',
    });
  }

  const args = [
    'run',
    '--no-capture-output',
    '-n',
    condaEnv,
    'python',
    '-m',
    'uvicorn',
    'src.api_server:app',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ];

  return spawn(conda, args, {
    cwd: backendRoot,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${port}/api/health`,
      { timeout: 2000 },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthy(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkHealth(port)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `TokenSmith API did not become healthy on port ${port} within ${timeoutMs}ms. ` +
      `Check the conda env "${getCondaEnv()}" (uvicorn, deps) or set TOKENSMITH_SKIP_MANAGED_BACKEND=1 if the API is managed manually.`
  );
}

function stopBackend() {
  if (!backendChild || backendChild.killed) {
    backendChild = null;
    return;
  }
  try {
    if (process.platform === 'win32') {
      backendChild.kill();
    } else {
      backendChild.kill('SIGTERM');
    }
  } catch (_) {
    /* ignore */
  }
  backendChild = null;
}

/**
 * Clone repo if needed; run init once; start uvicorn unless something already serves /api/health.
 */
async function ensureBackendRunning(app) {
  if (skipManagedBackend()) {
    console.log('[TokenSmith backend] Skipped (TOKENSMITH_SKIP_MANAGED_BACKEND).');
    return;
  }

  const port = getApiPort();
  if (await checkHealth(port)) {
    console.log(`[TokenSmith backend] Already running on port ${port}.`);
    return;
  }

  const backendRoot = getBackendRoot(app);
  const gitUrl = getGitUrl();

  try {
    await ensureClone(backendRoot, gitUrl);
  } catch (err) {
    console.error('[TokenSmith backend] Clone failed:', err.message);
    throw err;
  }

  if (!isRepoPresent(backendRoot)) {
    throw new Error(`TokenSmith checkout missing at ${backendRoot}`);
  }

  try {
    await runInitIfNeeded(backendRoot);
  } catch (err) {
    console.error('[TokenSmith backend] Init failed:', err.message);
    throw err;
  }

  console.log(`[TokenSmith backend] Starting from ${backendRoot} (port ${port})…`);
  backendChild = spawnBackend(backendRoot, port);

  backendChild.on('exit', (code, signal) => {
    backendChild = null;
    if (code !== null && code !== 0) {
      console.error(`[TokenSmith backend] Exited with code ${code}`);
    }
    if (signal) {
      console.error(`[TokenSmith backend] Killed by signal ${signal}`);
    }
  });

  backendChild.on('error', (err) => {
    console.error('[TokenSmith backend] Failed to spawn process:', err.message);
  });

  await waitForHealthy(port, 180000);
  console.log(`[TokenSmith backend] Ready on http://127.0.0.1:${port}`);
}

function registerApiOriginHeaderFix() {
  const { session } = require('electron');
  const apiPort = getApiPort();
  const fakeOrigin = 'http://localhost:5173';

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const u = details.url;
    if (
      u.startsWith(`http://127.0.0.1:${apiPort}/`) ||
      u.startsWith(`http://localhost:${apiPort}/`)
    ) {
      const headers = { ...details.requestHeaders, Origin: fakeOrigin };
      callback({ requestHeaders: headers });
      return;
    }
    callback({ requestHeaders: details.requestHeaders });
  });
}

module.exports = {
  ensureBackendRunning,
  stopBackend,
  registerApiOriginHeaderFix,
  skipManagedBackend,
  getApiPort,
};
