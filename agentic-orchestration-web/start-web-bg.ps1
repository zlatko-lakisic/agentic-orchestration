param(
  [int]$Port = 0,
  [Alias("Host")]
  [string]$BindHost = ""
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
    # `$env:$key = …` is not valid PowerShell for a dynamic name.
    Set-Item -Path "Env:$key" -Value $val
  }
}

Load-LocalDotEnv

# Defaults from .env unless caller passed parameters.
if (-not $BindHost.Trim()) {
  if ($env:AGENTIC_WEB_HOST) { $BindHost = "$($env:AGENTIC_WEB_HOST)".Trim() } else { $BindHost = "127.0.0.1" }
}
if ($Port -le 0) {
  if ($env:AGENTIC_WEB_PORT) { $p = "$($env:AGENTIC_WEB_PORT)".Trim() } else { $p = "3847" }
  try { $Port = [int]$p } catch { $Port = 3847 }
}

# Ensure deps exist
if (-not (Test-Path -Path "node_modules")) {
  Write-Host "[web-bg] node_modules missing -> npm ci"
  npm ci --omit=dev --no-audit --no-fund
}

$pidFile = Join-Path $here ".web-server.pid"
$logFile = Join-Path $here ".web-server.log"
$supervisorPidFile = Join-Path $here ".web-supervisor.pid"
$supervisorLogFile = Join-Path $here ".web-supervisor.log"
# Start-Process refuses to redirect stdout and stderr to the same file.
$supervisorErrLogFile = Join-Path $here ".web-supervisor.err.log"
$stopFlagFile = Join-Path $here ".web-supervisor.stop"

if (Test-Path $supervisorPidFile) {
  try {
    $oldPid = [int](Get-Content $supervisorPidFile -Raw)
    $p = Get-Process -Id $oldPid -ErrorAction Stop
    Write-Host "[web-bg] supervisor already running (pid=$oldPid). Stop it with: .\stop-web-bg.ps1"
    exit 0
  } catch {
    # stale pid file; continue
  }
}

$env:AGENTIC_WEB_PORT = "$Port"
$env:AGENTIC_WEB_HOST = "$BindHost"

Remove-Item -Force $stopFlagFile -ErrorAction SilentlyContinue

Write-Host "[web-bg] starting detached supervisor..."
Write-Host "[web-bg] supervisor log: $supervisorLogFile"
Write-Host "[web-bg] server log: $logFile"

$proc = Start-Process -FilePath "powershell" `
  -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    (Join-Path $here "run-web-supervisor.ps1"),
    "-Port",
    "$Port",
    "-BindHost",
    "$BindHost"
  ) `
  -WorkingDirectory $here `
  -WindowStyle Hidden `
  -RedirectStandardOutput $supervisorLogFile `
  -RedirectStandardError $supervisorErrLogFile `
  -PassThru

$proc.Id | Out-File -FilePath $supervisorPidFile -Encoding ascii -Force
Write-Host "[web-bg] supervisor started pid=$($proc.Id) (http://${BindHost}:$Port/)"

