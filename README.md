# Dungeoneer GUI

A small Electron-based Windows GUI for the Dungeoneer backend. It fetches data from the local HTTP API (default http://127.0.0.1:3030) and displays dungeon listings, details and contribution snapshots.

Quick start (PowerShell):

```powershell
cd dungeoneer-gui
npm install
npm start
```

Notes:
- The GUI assumes the dungeoneer server is reachable at http://127.0.0.1:3030. You can override this by setting the `DUNGEONEER_API_BASE` environment variable before launching the app.
- If you hit CORS errors in the renderer, run the app with a preload-based HTTP proxy (the current `preload.js` uses fetch from the renderer; it's intentionally minimal. If needed I can wire an IPC-based fetch to avoid CORS.)

Next steps you might want me to do:
- Add a small installer or packaged binary for Windows
- Improve styling and add search/filtering
- Add a settings page to configure the API base address in-app

