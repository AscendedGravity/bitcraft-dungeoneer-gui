# PowerShell helper to install dependencies and start the Electron app
Set-Location -Path $PSScriptRoot
if (-not (Test-Path node_modules)) {
  Write-Host "Installing npm dependencies (this may take a while)..."
  npm install
}
Write-Host "Starting Dungeoneer GUI..."
npm start
