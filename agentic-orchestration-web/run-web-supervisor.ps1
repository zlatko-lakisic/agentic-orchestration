param(
  [int]$Port = 0,
  [string]$Host = "",
  [int]$RestartDelaySec = 3
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

if (-not $Host.Trim()) { $Host = ($env:AGENTIC_WEB_HOST ?? "127.0.0.1").Trim() }
if ($Port -le 0) {
  $p = ($env:AGENTIC_WEB_PORT ?? "3847").Trim()
  try { $Port = [int]$p } catch { $Port = 3847 }
}

if (-not (Test-Path -Path "node_modules")) {
  Write-Host "[web-supervisor] node_modules missing -> npm install"
  npm install
}

$env:AGENTIC_WEB_PORT = "$Port"
$env:AGENTIC_WEB_HOST = "$Host"

$serverPidFile = Join-Path $here ".web-server.pid"
$stopFlagFile = Join-Path $here ".web-supervisor.stop"
$serverLogFile = Join-Path $here ".web-server.log"

Remove-Item -Force $stopFlagFile -ErrorAction SilentlyContinue

Write-Host "[web-supervisor] monitoring http://$Host`:$Port/"
Write-Host "[web-supervisor] server log: $serverLogFile"

while ($true) {
  if (Test-Path $stopFlagFile) {
    Write-Host "[web-supervisor] stop flag detected; exiting."
    break
  }

  $proc = Start-Process -FilePath "node" `
    -ArgumentList @("server.mjs") `
    -WorkingDirectory $here `
    -WindowStyle Hidden `
    -RedirectStandardOutput $serverLogFile `
    -RedirectStandardError $serverLogFile `
    -PassThru

  $proc.Id | Out-File -FilePath $serverPidFile -Encoding ascii -Force
  Write-Host "[web-supervisor] started server pid=$($proc.Id)"

  Wait-Process -Id $proc.Id
  $exitCode = $null
  try {
    $finished = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($finished) { $exitCode = $finished.ExitCode }
  } catch {
    # best effort
  }

  Remove-Item -Force $serverPidFile -ErrorAction SilentlyContinue

  if (Test-Path $stopFlagFile) {
    Write-Host "[web-supervisor] server exited after stop request."
    break
  }

  Write-Host "[web-supervisor] server exited (code=$exitCode). restarting in $RestartDelaySec sec..."
  Start-Sleep -Seconds $RestartDelaySec
}

