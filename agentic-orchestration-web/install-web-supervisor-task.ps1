param(
  [string]$TaskName = "AgenticOrchestrationWeb",
  [int]$Port = 3847,
  # Loopback by default. Pass -BindHost 0.0.0.0 (alias: -Host) only when an authenticating
  # proxy / VPN fronts the server: the chat WebSocket is unauthenticated until tokens are minted.
  [Alias("Host")]
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $here "start-web-bg.ps1"

if (-not (Test-Path $startScript)) {
  throw "Missing start script: $startScript"
}

$escapedStart = $startScript.Replace('"', '""')
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$escapedStart`" -Port $Port -BindHost `"$BindHost`""

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg -WorkingDirectory $here
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger @($triggerStartup, $triggerLogon) `
  -Settings $settings `
  -RunLevel Highest `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "[web-task] installed and started task '$TaskName'"
Write-Host "[web-task] config: host=$BindHost port=$Port"

