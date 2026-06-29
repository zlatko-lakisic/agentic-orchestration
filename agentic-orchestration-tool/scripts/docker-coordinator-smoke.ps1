# Build coordinator image and hit /api/ping (no LLM).
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$Image = "agentic-orchestrator-coordinator:local"

function Assert-LastExit([int]$Expected, [string]$Label) {
    if ($LASTEXITCODE -ne $Expected) {
        throw "$Label failed (exit $LASTEXITCODE, expected $Expected)"
    }
}

Write-Host "Building $Image ..."
docker build -f (Join-Path $RepoRoot "agentic-orchestration-tool\docker\Dockerfile.coordinator") `
  -t $Image $RepoRoot
Assert-LastExit 0 "coordinator image build"

$cid = docker run -d --rm -p 3847:3847 `
  -e AGENTIC_EXECUTION_BACKEND=inprocess `
  $Image
try {
    Start-Sleep -Seconds 3
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:3847/api/ping" -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -ne 200) {
        throw "Expected HTTP 200 from /api/ping, got $($resp.StatusCode)"
    }
    Write-Host "Coordinator smoke OK (/api/ping 200)."
} finally {
    docker stop $cid | Out-Null
}
