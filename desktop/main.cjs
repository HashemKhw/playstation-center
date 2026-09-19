const { app, BrowserWindow, dialog, shell } = require('electron');
const { fork } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3210;
let serverProcess;
let mainWindow;
let quitting = false;

function fileDatabaseUrl(filePath) {
  return `file:${filePath.replaceAll('\\', '/')}`;
}

function ensureDatabase() {
  const dataDirectory = path.join(app.getPath('userData'), 'data');
  const databasePath = path.join(dataDirectory, 'center.sqlite');
  fs.mkdirSync(dataDirectory, { recursive: true });

  if (!fs.existsSync(databasePath)) {
    const seedPath = app.isPackaged
      ? path.join(process.resourcesPath, 'seed.sqlite')
      : path.join(app.getAppPath(), 'build', 'seed.sqlite');
    fs.copyFileSync(seedPath, databasePath);
  }

  return { dataDirectory, databasePath };
}

function startServer() {
  const { dataDirectory, databasePath } = ensureDatabase();
  const appPath = app.getAppPath();
  const runnerPath = path.join(appPath, 'desktop', 'server-runner.cjs');

  serverProcess = fork(runnerPath, [], {
    cwd: appPath,
    env: {
      ...process.env,
      DATABASE_URL: fileDatabaseUrl(databasePath),
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      PSCENTER_DATA_DIR: dataDirectory,
      PSCENTER_STATIC_DIR: path.join(appPath, 'client', 'dist'),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProcess.stdout?.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`));
  serverProcess.stderr?.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  serverProcess.on('exit', () => {
    console.log('Local server process exited.');
    serverProcess = undefined;
    if (!quitting) setTimeout(startServer, 600);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The local application server did not start.');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: '#0a0a0c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:')) return { action: 'allow' };
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) event.preventDefault();
  });

  await waitForServer();
  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on('closed', () => console.log('Main window closed.'));
  mainWindow.show();
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    startServer();
    try {
      await createWindow();
    } catch (error) {
      dialog.showErrorBox('PlayStation Center', error instanceof Error ? error.message : String(error));
      app.quit();
    }
  });
}

app.on('before-quit', () => {
  console.log('Desktop application is quitting.');
  quitting = true;
  serverProcess?.kill();
});

app.on('window-all-closed', () => {
  app.quit();
});
