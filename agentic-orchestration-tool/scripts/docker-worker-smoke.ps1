# Build worker image and run a no-LLM smoke check (invalid spec -> exit 2).
$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ToolRoot

$Image = "agentic-orchestrator-worker:local"
Write-Host "Building $Image ..."
docker build -f docker/Dockerfile.worker -t $Image .

$SmokeDir = Join-Path $env:TEMP "agentic-worker-smoke"
New-Item -ItemType Directory -Force -Path $SmokeDir | Out-Null
$BadSpec = Join-Path $SmokeDir "bad-spec.json"
$BadSpecJson = '{"schema_version":"0.1","run_id":"smoke","step_id":"s1","task":{},"agent_provider":{},"paths":{}}'
[System.IO.File]::WriteAllText($BadSpec, $BadSpecJson, (New-Object System.Text.UTF8Encoding $false))

Write-Host "Running worker with invalid spec (expect exit 2) ..."
docker run --rm -v "${SmokeDir}:/run/store:ro" $Image /run/store/bad-spec.json
$code = $LASTEXITCODE
if ($code -ne 2) {
    Write-Error "Expected exit code 2, got $code"
}
Write-Host "Worker smoke OK (exit $code)."
