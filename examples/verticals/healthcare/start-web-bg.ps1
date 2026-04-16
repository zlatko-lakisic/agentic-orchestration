param(
  [int]$Port = 0,
  [string]$Host = ""
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$name'."
  }
}

Require-Command node
Require-Command npm

$ExampleDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $ExampleDir "..\..\..")).Path
$ToolRoot = (Resolve-Path (Join-Path $RepoRoot "agentic-orchestration-tool")).Path
$WebRoot = (Resolve-Path (Join-Path $RepoRoot "agentic-orchestration-web")).Path

function Load-WebDotEnv {
  $envPath = Join-Path $WebRoot ".env"
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
    Set-Item -Path "Env:$key" -Value $val
  }
}

Load-WebDotEnv

$env:AGENTIC_EXAMPLE = "healthcare"
$env:AGENTIC_TOOL_ROOT = $ToolRoot

if (-not $Host.Trim()) { $Host = ($env:AGENTIC_WEB_HOST ?? "127.0.0.1").Trim() }
if ($Port -le 0) {
  $p = ($env:AGENTIC_WEB_PORT ?? "3850").Trim()
  try { $Port = [int]$p } catch { $Port = 3850 }
}

$env:AGENTIC_WEB_HOST = "$Host"
$env:AGENTIC_WEB_PORT = "$Port"
$env:PYTHONUTF8 = "1"

Push-Location $WebRoot
try {
  if (-not (Test-Path -Path "node_modules")) {
    Write-Host "[healthcare-web-bg] node_modules missing -> npm install"
    npm install
  }
} finally {
  Pop-Location
}

$pidFile = Join-Path $ExampleDir ".web-server.pid"
$logFile = Join-Path $ExampleDir ".web-server.log"

if (Test-Path $pidFile) {
  try {
    $oldPid = [int](Get-Content $pidFile -Raw)
    $null = Get-Process -Id $oldPid -ErrorAction Stop
    Write-Host "[healthcare-web-bg] already running (pid=$oldPid). Stop with: .\stop-web.ps1"
    exit 0
  } catch {
    # stale pid
  }
}

Write-Host "[healthcare-web-bg] starting detached server..."
Write-Host "[healthcare-web-bg] log: $logFile"

$proc = Start-Process -FilePath "node" `
  -ArgumentList @("server.mjs", "--example", "healthcare") `
  -WorkingDirectory $WebRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile `
  -PassThru

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii -Force
Write-Host "[healthcare-web-bg] started pid=$($proc.Id) (http://${Host}:$Port/)"
