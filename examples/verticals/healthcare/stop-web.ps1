param()

$ErrorActionPreference = "Stop"

$ExampleDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $ExampleDir "..\..\..")).Path
$WebRoot = (Resolve-Path (Join-Path $RepoRoot "agentic-orchestration-web")).Path
$pidFile = Join-Path $ExampleDir ".web-server.pid"

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
$port = 3850
try {
  $p = ($env:AGENTIC_WEB_PORT ?? "3850").Trim()
  $port = [int]$p
} catch {
  $port = 3850
}

if (-not (Test-Path $pidFile)) {
  Write-Host "[healthcare-web] no pid file ($pidFile)."
  exit 0
}

$serverPid = [int](Get-Content $pidFile -Raw)
try {
  Stop-Process -Id $serverPid -Force
  Write-Host "[healthcare-web] stopped pid=$serverPid"
} catch {
  Write-Host "[healthcare-web] process not running (pid=$serverPid)"
}

Remove-Item -Force $pidFile -ErrorAction SilentlyContinue

if (($env:AGENTIC_WEB_KILL_PORT ?? "").Trim() -eq "1") {
  Write-Host "[healthcare-web] AGENTIC_WEB_KILL_PORT=1 -> try stopping listeners on port $port (Get-NetTCPConnection / taskkill as needed on Windows)."
}
