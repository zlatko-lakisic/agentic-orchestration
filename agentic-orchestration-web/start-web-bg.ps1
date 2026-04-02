param(
  [int]$Port = 3847,
  [string]$Host = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$name'. Install Node.js (includes npm) and ensure it's on PATH."
  }
}

Require-Command npm

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# Ensure deps exist
if (-not (Test-Path -Path "node_modules")) {
  Write-Host "[web-bg] node_modules missing -> npm install"
  npm install
}

$pidFile = Join-Path $here ".web-server.pid"
$logFile = Join-Path $here ".web-server.log"

if (Test-Path $pidFile) {
  try {
    $oldPid = [int](Get-Content $pidFile -Raw)
    $p = Get-Process -Id $oldPid -ErrorAction Stop
    Write-Host "[web-bg] already running (pid=$oldPid). Stop it with: .\stop-web-bg.ps1"
    exit 0
  } catch {
    # stale pid file; continue
  }
}

$env:AGENTIC_WEB_PORT = "$Port"
$env:AGENTIC_WEB_HOST = "$Host"

Write-Host "[web-bg] starting detached server..."
Write-Host "[web-bg] log: $logFile"

$proc = Start-Process -FilePath "npm" `
  -ArgumentList @("start") `
  -WorkingDirectory $here `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile `
  -PassThru

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii -Force
Write-Host "[web-bg] started pid=$($proc.Id) (http://$Host`:$Port/)"

