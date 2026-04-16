param(
  [int]$RestartDelaySeconds = 2
)

$ErrorActionPreference = "Stop"

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
if (-not $env:AGENTIC_WEB_HOST) { $env:AGENTIC_WEB_HOST = "127.0.0.1" }
if (-not $env:AGENTIC_WEB_PORT) { $env:AGENTIC_WEB_PORT = "3850" }

function Ensure-NpmInstall {
  Push-Location $WebRoot
  try {
    if (-not (Test-Path -Path "node_modules")) {
      Write-Host "[healthcare-web] node_modules missing -> npm install"
      npm install
    }
  } finally {
    Pop-Location
  }
}

try {
  $null = Get-Command npm -ErrorAction Stop
} catch {
  Write-Host "[healthcare-web] error: npm not found on PATH."
  exit 1
}

Write-Host "[healthcare-web] example=healthcare port=$($env:AGENTIC_WEB_PORT) tool_root=$ToolRoot"
Write-Host "[healthcare-web] web root: $WebRoot"

while ($true) {
  try {
    Ensure-NpmInstall
    Push-Location $WebRoot
    try {
      Write-Host "[healthcare-web] npm run start:healthcare"
      npm run start:healthcare
      Write-Host "[healthcare-web] server exited (code=$LASTEXITCODE)"
    } finally {
      Pop-Location
    }
  } catch {
    Write-Host ("[healthcare-web] error: " + $_.Exception.Message)
  }
  Start-Sleep -Seconds $RestartDelaySeconds
  Write-Host "[healthcare-web] restarting..."
}
