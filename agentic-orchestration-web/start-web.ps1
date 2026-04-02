param(
  [int]$RestartDelaySeconds = 2
)

$ErrorActionPreference = "Stop"

function Ensure-NpmInstall {
  if (-not (Test-Path -Path "node_modules")) {
    Write-Host "[web] node_modules missing -> npm install"
    npm install
  }
}

Write-Host "[web] starting agentic-orchestration-web (auto-restart)"
Write-Host ("[web] cwd: " + (Get-Location))

try {
  $null = Get-Command npm -ErrorAction Stop
} catch {
  Write-Host "[web] error: npm not found on PATH. Install Node.js (includes npm) and restart your terminal."
  exit 1
}

while ($true) {
  try {
    Ensure-NpmInstall
    Write-Host "[web] npm start"
    npm start
    Write-Host "[web] server exited (code=$LASTEXITCODE)"
  } catch {
    Write-Host ("[web] error: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $RestartDelaySeconds
  Write-Host "[web] restarting..."
}

