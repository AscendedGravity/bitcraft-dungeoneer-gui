const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Load local .env in development if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    require('dotenv').config({ path: envPath });
  } catch (err) {
    // run when environment variables are provided by the shell/host
    console.warn('dotenv.load failed (is dotenv installed?):', err && err.message);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// Inject a Content-Security-Policy header based on runtime environment.
function makeCSP(apiBase) {
  // Basic safe default and explicit connect-src directive so network
  // connections from the renderer are allowed only to intended origins.
  const baseDirective = "default-src 'self' 'unsafe-inline'";
  const connectDirective = apiBase ? `connect-src 'self' ${apiBase}` : "connect-src 'self'";
  return `${baseDirective}; ${connectDirective};`;
}

app.whenReady().then(() => {
  let apiBase = process.env.DUNGEONEER_API_BASE || '';
  // Normalize the configured value to an origin (scheme + host + port)
  if (apiBase) {
    try {
      apiBase = new URL(apiBase).origin;
    } catch (err) {
      console.warn('DUNGEONEER_API_BASE is not a valid URL, ignoring it for CSP:', apiBase);
      apiBase = '';
    }
  }

  const csp = makeCSP(apiBase);

  // Apply header to all responses served by the default session.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    // Overwrite or set the Content-Security-Policy header
    responseHeaders['Content-Security-Policy'] = [csp];
    callback({ responseHeaders });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
