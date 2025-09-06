const { contextBridge } = require('electron');

// A tiny safe wrapper to fetch JSON from the local dungeoneer HTTP API.
// This uses the renderer's fetch (available in modern Electron/node) and
// exposes a minimal API to the page.
contextBridge.exposeInMainWorld('api', {
  fetchJSON: async (path) => {
    const base = process.env.DUNGEONEER_API_BASE || 'http://127.0.0.1:3030';
    const url = `${base}${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
});
