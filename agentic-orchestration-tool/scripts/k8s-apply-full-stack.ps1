# Deploy full in-cluster stack: run-store, secret, coordinator, warm pool, delegation broker, fetch gateway.
# Usage: powershell -File scripts/k8s-apply-full-stack.ps1 [-SkipBuild] [-SkipFetchGateway]
param(
    [switch]$SkipBuild,
    [switch]$SkipFetchGateway
)

$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RepoRoot = Split-Path -Parent $ToolRoot
$KindExe = Join-Path $ToolRoot ".tools\kind.exe"
$ClusterName = "agentic"
$CoordinatorImage = "agentic-orchestrator-coordinator:local"
$WorkerImage = "agentic-orchestrator-worker:local"

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not [string]::IsNullOrWhiteSpace($key)) {
            Set-Item -Path "env:$key" -Value $value
        }
    }
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Assert-LastExit([int]$Expected, [string]$Label) {
    if ($LASTEXITCODE -ne $Expected) {
        throw "$Label failed (exit $LASTEXITCODE, expected $Expected)"
    }
}

Import-DotEnv (Join-Path $ToolRoot ".env")

$HostPath = ($env:AGENTIC_K8S_RUN_STORE_HOST_PATH -replace '\\', '/')
if ([string]::IsNullOrWhiteSpace($HostPath)) {
    $HostPath = ($env:AGENTIC_RUN_STORE_PATH -replace '\\', '/')
}
if ([string]::IsNullOrWhiteSpace($HostPath)) { $HostPath = "D:/run" }
New-Item -ItemType Directory -Force -Path ($HostPath -replace '/', '\') | Out-Null

$env:AGENTIC_K8S_RUN_STORE_VOLUME = "hostpath"
$env:AGENTIC_K8S_RUN_STORE_HOST_PATH = $HostPath

if (-not (Test-Path $KindExe)) {
    throw "Missing $KindExe - run scripts/k8s-kind-up.ps1 first or install kind to .tools/kind.exe"
}

kubectl config use-context "kind-$ClusterName" 2>$null | Out-Null
kubectl get nodes -o name 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Step "Create kind cluster"
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\k8s-kind-up.ps1")
    Assert-LastExit 0 "kind cluster create"
}

Write-Step "Apply run-store PVC"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\k8s-apply-run-store.ps1")
Assert-LastExit 0 "run-store apply"

Write-Step "Sync K8s env secret"
$SecretEnv = Join-Path $env:TEMP "agentic-k8s-full-stack.env"
$extra = @(
    "AGENTIC_EXECUTION_BACKEND=kubernetes",
    "AGENTIC_MCP_FETCH_ENABLED=1",
    "AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url,filesystem_local",
    "FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace",
    "AGENTIC_K8S_WARM_POOL_ENABLED=1",
    "AGENTIC_K8S_DELEGATION_ENABLED=1",
    "AGENTIC_LOG_FORMAT=json"
)
$lines = @()
Get-Content (Join-Path $ToolRoot ".env") | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $lines += $line
    }
}
($lines + $extra | Select-Object -Unique) | Set-Content -Path $SecretEnv -Encoding ascii
kubectl create secret generic agentic-orchestrator-env `
    -n agentic-orchestration `
    --from-env-file=$SecretEnv `
    --dry-run=client -o yaml | kubectl apply -f -
Assert-LastExit 0 "K8s secret sync"

if (-not $SkipBuild) {
    Write-Step "Build coordinator + worker images"
    docker build -f (Join-Path $ToolRoot "docker\Dockerfile.coordinator") -t $CoordinatorImage $RepoRoot
    Assert-LastExit 0 "coordinator image build"
    Set-Location $ToolRoot
    docker build -f docker/Dockerfile.worker -t $WorkerImage .
    Assert-LastExit 0 "worker image build"

    Write-Step "Load images into kind"
    & $KindExe load docker-image $CoordinatorImage --name $ClusterName
    Assert-LastExit 0 "coordinator image load"
    & $KindExe load docker-image $WorkerImage --name $ClusterName
    Assert-LastExit 0 "worker image load"
}

Write-Step "Apply coordinator"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\k8s-apply-coordinator.ps1")
Assert-LastExit 0 "coordinator apply"

kubectl set env deployment/agentic-coordinator -n agentic-orchestration `
    AGENTIC_K8S_WARM_POOL_ENABLED=1 `
    AGENTIC_LOG_FORMAT=json 2>$null | Out-Null
kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=180s
Assert-LastExit 0 "coordinator rollout"

Write-Step "Apply warm pool + delegation broker"
kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\warm-pool.yaml")
kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\delegation-broker.yaml")
kubectl rollout status deployment/agentic-warm-pool -n agentic-orchestration --timeout=180s
Assert-LastExit 0 "warm pool rollout"
kubectl rollout status deployment/agentic-delegation-broker -n agentic-orchestration --timeout=180s
Assert-LastExit 0 "delegation broker rollout"

if (-not $SkipFetchGateway) {
    Write-Step "Apply fetch MCP gateway (optional cluster HTTP bridge)"
    kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\mcp-sidecars\fetch-url-gateway.yaml")
    kubectl rollout status deployment/agentic-mcp-fetch -n agentic-orchestration --timeout=180s
    Assert-LastExit 0 "fetch gateway rollout"
}

Write-Host ""
Write-Host "Full stack deployed." -ForegroundColor Green
Write-Host "  kubectl get pods -n agentic-orchestration"
Write-Host "  kubectl port-forward -n agentic-orchestration svc/agentic-coordinator 3847:3847"
Write-Host "  Open http://127.0.0.1:3847 - workflows run in-cluster (coordinator dispatches worker Jobs / warm pool)."
