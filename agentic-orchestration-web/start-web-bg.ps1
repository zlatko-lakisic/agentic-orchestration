param(
  [int]$Port = 0,
  [string]$Host = ""
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$name'. Install Node.js (includes npm) and ensure it's on PATH."
  }
}

Require-Command node
Require-Command npm

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

function Load-LocalDotEnv {
  $envPath = Join-Path $here ".env"
  if (-not (Test-Path -Path $envPath)) { return }
  $raw = Get-Content -Path $envPath -Raw
  foreach ($line in $raw -split "`n") {
    $trimmed = $line.Trim()
    if (-not $trimmed) { continue }
    if ($trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -le 0) { continue }
    $key = $trimmed.Substring(0, $eq).Trim()
    if (-not $key) { continue }
    if (Test-Path Env:$key) { continue }
    $val = $trimmed.Substring($eq + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $env:$key = $val
  }
}

Load-LocalDotEnv

# Defaults from .env unless caller passed parameters.
if (-not $Host.Trim()) { $Host = ($env:AGENTIC_WEB_HOST ?? "127.0.0.1").Trim() }
if ($Port -le 0) {
  $p = ($env:AGENTIC_WEB_PORT ?? "3847").Trim()
  try { $Port = [int]$p } catch { $Port = 3847 }
}

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

$proc = Start-Process -FilePath "node" `
  -ArgumentList @("server.mjs") `
  -WorkingDirectory $here `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile `
  -PassThru

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii -Force
Write-Host "[web-bg] started pid=$($proc.Id) (http://$Host`:$Port/)"

