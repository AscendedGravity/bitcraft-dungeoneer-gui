# Dungeoneer GUI

A small Electron-based Windows GUI for the [Dungeoneer backend](https://github.com/AscendedGravity/bitcraft-dungeoneer) (currently develop branch). It fetches data from the local HTTP API (default http://127.0.0.1:3030) and displays dungeon listings, details and contribution snapshots.

Quick start (PowerShell):

```powershell
cd bitcraft-dungeoneer-gui
npm install
npm start
```

Notes:
- The GUI assumes the dungeoneer server is reachable at http://127.0.0.1:3030. You can override this by setting the `DUNGEONEER_API_BASE` environment variable before launching the app.
