# Dungeoneer GUI

A small Electron-based Windows GUI for the [Dungeoneer backend](https://github.com/AscendedGravity/bitcraft-dungeoneer) (currently develop branch). It fetches data from the local HTTP API (default http://127.0.0.1:3030) and displays dungeon listings, details and contribution snapshots.

Quick start (PowerShell):

```powershell
cd bitcraft-dungeoneer-gui
npm install
# set the API base for this session, then start the app
$env:DUNGEONEER_API_BASE = 'http://127.0.0.1:3030'  # example for local dev
npm start
```

Note:
- API base may also be set via .env. Rename .env.example to just .env to use the default localhost and port. Change it to match your dungeoneer backend if you changed it.