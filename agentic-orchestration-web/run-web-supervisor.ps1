param(
  [int]$Port = 0,
  [Alias("Host")]
  [string]$BindHost = "",
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
    # `$env:$key = …` is not valid PowerShell for a dynamic name.
    Set-Item -Path "Env:$key" -Value $val
  }
}

Load-LocalDotEnv

if (-not $BindHost.Trim()) {
  if ($env:AGENTIC_WEB_HOST) { $BindHost = "$($env:AGENTIC_WEB_HOST)".Trim() } else { $BindHost = "127.0.0.1" }
}
if ($Port -le 0) {
  if ($env:AGENTIC_WEB_PORT) { $p = "$($env:AGENTIC_WEB_PORT)".Trim() } else { $p = "3847" }
  try { $Port = [int]$p } catch { $Port = 3847 }
}

if (-not (Test-Path -Path "node_modules")) {
  Write-Host "[web-supervisor] node_modules missing -> npm ci"
  npm ci --omit=dev --no-audit --no-fund
}

$env:AGENTIC_WEB_PORT = "$Port"
$env:AGENTIC_WEB_HOST = "$BindHost"

$serverPidFile = Join-Path $here ".web-server.pid"
$stopFlagFile = Join-Path $here ".web-supervisor.stop"
$serverLogFile = Join-Path $here ".web-server.log"
# Start-Process refuses to redirect stdout and stderr to the same file.
$serverErrLogFile = Join-Path $here ".web-server.err.log"

Remove-Item -Force $stopFlagFile -ErrorAction SilentlyContinue

Write-Host "[web-supervisor] monitoring http://${BindHost}:$Port/"
Write-Host "[web-supervisor] server log: $serverLogFile (stderr: $serverErrLogFile)"

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
    -RedirectStandardError $serverErrLogFile `
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

