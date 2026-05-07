param()

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $here ".web-server.pid"
$supervisorPidFile = Join-Path $here ".web-supervisor.pid"
$stopFlagFile = Join-Path $here ".web-supervisor.stop"

New-Item -Path $stopFlagFile -ItemType File -Force | Out-Null

if (Test-Path $supervisorPidFile) {
  $supervisorPid = [int](Get-Content $supervisorPidFile -Raw)
  try {
    Stop-Process -Id $supervisorPid -Force
    Write-Host "[web-bg] stopped supervisor pid=$supervisorPid"
  } catch {
    Write-Host "[web-bg] supervisor not running (pid=$supervisorPid)"
  }
  Remove-Item -Force $supervisorPidFile -ErrorAction SilentlyContinue
}

if (Test-Path $pidFile) {
  $pid = [int](Get-Content $pidFile -Raw)
  try {
    Stop-Process -Id $pid -Force
    Write-Host "[web-bg] stopped server pid=$pid"
  } catch {
    Write-Host "[web-bg] server not running (pid=$pid)"
  }
  Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
}

Remove-Item -Force $stopFlagFile -ErrorAction SilentlyContinue

