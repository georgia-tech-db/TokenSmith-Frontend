/**
 * Electron main process — loads the Vite dev server in development,
 * or the built static files when packaged.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

function isDev() {
  if (app.isPackaged) return false;
  return process.env.NODE_ENV !== 'production';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    title: 'TokenSmith',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev()) {
    win.loadURL(DEV_URL).catch((err) => {
      console.error(`Failed to load ${DEV_URL}. Is Vite running? (npm run dev)`, err);
    });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
