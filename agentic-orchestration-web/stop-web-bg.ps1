param()

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $here ".web-server.pid"

if (-not (Test-Path $pidFile)) {
  Write-Host "[web-bg] no pid file found ($pidFile)."
  exit 0
}

$pid = [int](Get-Content $pidFile -Raw)
try {
  Stop-Process -Id $pid -Force
  Write-Host "[web-bg] stopped pid=$pid"
} catch {
  Write-Host "[web-bg] process not running (pid=$pid)"
}

Remove-Item -Force $pidFile -ErrorAction SilentlyContinue

