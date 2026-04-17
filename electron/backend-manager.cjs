/**
 * Starts the TokenSmith FastAPI process for the Electron app using the embedded
 * CPython layout under resources/python (packaged) or TOKENSMITH_PYTHON / python3 (dev).
 *
 * Environment (optional):
 * - TOKENSMITH_SKIP_MANAGED_BACKEND=1 — do not start the backend
 * - TOKENSMITH_BACKEND_PATH — TokenSmith repo root (dev override; packaged uses resources/backend)
 * - TOKENSMITH_PYTHON — python binary (dev override; packaged resolves resources/python/bin/…)
 * - TOKENSMITH_API_PORT — API port (default: 8000)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

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

function apiServerPath(backendRoot) {
  return path.join(backendRoot, 'src', 'api_server.py');
}

function isRepoPresent(backendRoot) {
  return fs.existsSync(apiServerPath(backendRoot));
}

function getEmbeddedPythonBin(resourcesPath) {
  const home = path.join(resourcesPath, 'python');
  const names = ['python3.12', 'python3', 'python'];
  for (const name of names) {
    const binPath = path.join(home, 'bin', name);
    if (fs.existsSync(binPath)) {
      try {
        fs.accessSync(binPath, fs.constants.X_OK);
        return binPath;
      } catch {
        /* try next */
      }
    }
  }
  throw new Error(
    `Embedded Python not found under ${path.join(home, 'bin')}. Run scripts/package-mac.sh python deps.`
  );
}

function getPythonExecutable(app) {
  if (process.env.TOKENSMITH_PYTHON) {
    return process.env.TOKENSMITH_PYTHON;
  }
   if (app.isPackaged) {
    return getEmbeddedPythonBin(process.resourcesPath);
  }
  /* Dev: match TokenSmith environment.yml (python 3.12); override with TOKENSMITH_PYTHON. */
  return process.platform === 'win32' ? 'python' : 'python3.12';
}

function getBackendRoot(app) {
  if (process.env.TOKENSMITH_BACKEND_PATH) {
    return path.resolve(process.env.TOKENSMITH_BACKEND_PATH);
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  const sibling = path.join(__dirname, '..', 'TokenSmith');
  if (isRepoPresent(sibling)) {
    return sibling;
  }
  throw new Error(
    'Set TOKENSMITH_BACKEND_PATH to your TokenSmith checkout, or clone georgia-tech-db/TokenSmith next to this repo as ./TokenSmith.'
  );
}

function spawnBackend(pythonExe, backendRoot, port) {
  const args = [
    '-m',
    'uvicorn',
    'src.api_server:app',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ];
  return spawn(pythonExe, args, {
    cwd: backendRoot,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
    stdio: 'inherit',
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
      'Check backend logs, artifacts under the TokenSmith config, or set TOKENSMITH_SKIP_MANAGED_BACKEND=1 if the API runs elsewhere.'
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
 * Start uvicorn unless something already serves /api/health.
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
  if (!isRepoPresent(backendRoot)) {
    throw new Error(`TokenSmith backend missing at ${backendRoot} (expected src/api_server.py).`);
  }

  const pythonExe = getPythonExecutable(app);

  console.log(`[TokenSmith backend] Starting from ${backendRoot} (${pythonExe}, port ${port})…`);
  backendChild = spawnBackend(pythonExe, backendRoot, port);

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
