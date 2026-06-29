# Pre-publish local verification: unit/integration tests + kind cluster e2e + LLM + K4 MCP smokes.
# Usage: powershell -File scripts/k8s-local-verify.ps1 [-SkipLlm] [-SkipFetchSmoke] [-SkipFilesystemSmoke] [-RecreateCluster]
param(
    [switch]$SkipLlm,
    [switch]$SkipFetchSmoke,
    [switch]$SkipFilesystemSmoke,
    [switch]$RecreateCluster
)

$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ToolRoot

$KindExe = Join-Path $ToolRoot ".tools\kind.exe"
$ClusterName = "agentic"
$Python = Join-Path $ToolRoot ".venv\Scripts\python.exe"
$StubImage = "agentic-orchestrator-worker-stub:ci"
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

function Initialize-FilesystemSmokeWorkspace([string]$RunStoreHostPath) {
    $fsRoot = Join-Path ($RunStoreHostPath -replace '/', '\') "mcp-fs-workspace"
    New-Item -ItemType Directory -Force -Path $fsRoot | Out-Null
    $hello = Join-Path $fsRoot "hello.txt"
    [System.IO.File]::WriteAllText($hello, "K4 filesystem smoke", (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Seeded $hello"
}

Import-DotEnv (Join-Path $ToolRoot ".env")

# Clear optional K4 test env so pytest defaults are not polluted by prior shell runs.
Remove-Item Env:AGENTIC_K8S_POD_SIDECAR_MCPS -ErrorAction SilentlyContinue
Remove-Item Env:AGENTIC_K8S_MCP_FETCH_URL -ErrorAction SilentlyContinue
Remove-Item Env:AGENTIC_KIND_E2E -ErrorAction SilentlyContinue

$HostPath = ($env:AGENTIC_K8S_RUN_STORE_HOST_PATH -replace '\\', '/')
if ([string]::IsNullOrWhiteSpace($HostPath)) {
    $HostPath = ($env:AGENTIC_RUN_STORE_PATH -replace '\\', '/')
}
if ([string]::IsNullOrWhiteSpace($HostPath)) { $HostPath = "D:/run" }
New-Item -ItemType Directory -Force -Path ($HostPath -replace '/', '\') | Out-Null

$env:AGENTIC_EXECUTION_BACKEND = "kubernetes"
$env:AGENTIC_RUN_STORE_PATH = ($HostPath -replace '/', '\')
$env:AGENTIC_K8S_RUN_STORE_VOLUME = "hostpath"
$env:AGENTIC_K8S_RUN_STORE_HOST_PATH = $HostPath
$env:AGENTIC_K8S_WORKER_IMAGE = $WorkerImage
$env:AGENTIC_K8S_NAMESPACE = "agentic-orchestration"
$env:AGENTIC_K8S_RUN_STORE_PVC = "agentic-run-store"
$env:AGENTIC_K8S_RUN_STORE_MOUNT = "/run/store"

Write-Step "Unit tests"
& $Python -m pytest -m unit -q --tb=short
Assert-LastExit 0 "Unit tests"

Write-Step "Integration tests (mocked K8s/subprocess)"
& $Python -m pytest -m integration -q --tb=short
Assert-LastExit 0 "Integration tests"

Write-Step "Docker worker smoke"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\docker-worker-smoke.ps1")
Assert-LastExit 0 "Docker worker smoke"

if (-not (Test-Path $KindExe)) {
    throw "Missing $KindExe - download kind to .tools/kind.exe"
}

$clusters = @(cmd.exe /c "`"$KindExe`" get clusters 2>nul")
$clusterUp = $false
if ($clusters -contains $ClusterName) {
    kubectl config use-context "kind-$ClusterName" 2>$null | Out-Null
    $prevErr = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    kubectl get nodes -o name 2>$null | Out-Null
    $clusterUp = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prevErr
}

if ($RecreateCluster -or (-not $clusterUp)) {
    if ($clusters -contains $ClusterName) {
        Write-Host "Deleting stale kind cluster '$ClusterName' ..."
        & $KindExe delete cluster --name $ClusterName
    }
    Write-Step "Create kind cluster"
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\k8s-kind-up.ps1")
    Assert-LastExit 0 "kind cluster create"
} else {
    kubectl config use-context "kind-$ClusterName"
    Write-Host "Reusing kind cluster '$ClusterName'"
}

Write-Step "Apply run-store PVC"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ToolRoot "scripts\k8s-apply-run-store.ps1")
Assert-LastExit 0 "run-store apply"

Write-Step "Sync K8s env secret"
$SecretEnv = Join-Path $env:TEMP "agentic-k8s-secret.env"
$extra = @(
    "AGENTIC_MCP_FETCH_ENABLED=1",
    "AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url",
    "FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace"
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

Write-Step "Run-store probe pod"
kubectl delete pod run-store-probe -n agentic-orchestration --ignore-not-found 2>$null | Out-Null
kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\run-store\probe-pod.yaml")
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/run-store-probe -n agentic-orchestration --timeout=180s
Assert-LastExit 0 "run-store probe"

Write-Step "Build stub worker + load into kind"
docker build -f docker/Dockerfile.worker-stub -t $StubImage .
Assert-LastExit 0 "stub image build"
& $KindExe load docker-image $StubImage --name $ClusterName
Assert-LastExit 0 "stub image load"

Write-Step "Kind e2e (stub worker, no LLM)"
$env:AGENTIC_KIND_E2E = "1"
$env:AGENTIC_K8S_WORKER_IMAGE = $StubImage
& $Python -m pytest tests/test_kind_kubernetes_e2e.py -m kind_e2e -o 'addopts=-ra' --tb=short
Assert-LastExit 0 "kind stub e2e"

if (-not $SkipLlm -or -not $SkipFetchSmoke -or -not $SkipFilesystemSmoke) {
    Write-Step "Load real worker image into kind"
    & $KindExe load docker-image $WorkerImage --name $ClusterName
    Assert-LastExit 0 "worker image load"
}

if (-not $SkipLlm) {
    Write-Step "Kind e2e (real worker + LLM) - workflow_brainstorm"
    $env:AGENTIC_K8S_WORKER_IMAGE = $WorkerImage
    Remove-Item Env:AGENTIC_KIND_E2E -ErrorAction SilentlyContinue
    & $Python main.py config/workflows/workflow_brainstorm.yaml --quiet
    Assert-LastExit 0 "brainstorm LLM workflow"
}

Write-Step "K4 cluster fetch gateway (K4.2)"
kubectl apply -f (Join-Path $ToolRoot "deploy\k8s\mcp-sidecars\fetch-url-gateway.yaml")
kubectl rollout status deployment/agentic-mcp-fetch -n agentic-orchestration --timeout=180s
Assert-LastExit 0 "fetch gateway rollout"

if (-not $SkipFetchSmoke) {
    Write-Step "K4 fetch MCP smoke (worker stdio fetch_url)"
    Remove-Item Env:AGENTIC_K8S_POD_SIDECAR_MCPS -ErrorAction SilentlyContinue
    Remove-Item Env:AGENTIC_K8S_MCP_FETCH_URL -ErrorAction SilentlyContinue
    $env:AGENTIC_K8S_WORKER_STDIO_MCPS = "fetch_url"
    $env:AGENTIC_MCP_FETCH_ENABLED = "1"
    $env:AGENTIC_K8S_WORKER_IMAGE = $WorkerImage
    & $Python main.py config/workflows/workflow_fetch_sidecar_smoke.yaml --quiet
    Assert-LastExit 0 "fetch worker stdio smoke"
}

if (-not $SkipFilesystemSmoke) {
    Write-Step "K4 filesystem MCP smoke (worker stdio filesystem_local)"
    Initialize-FilesystemSmokeWorkspace $HostPath
    Remove-Item Env:AGENTIC_K8S_POD_SIDECAR_MCPS -ErrorAction SilentlyContinue
    Remove-Item Env:AGENTIC_K8S_MCP_FILESYSTEM_URL -ErrorAction SilentlyContinue
    $env:AGENTIC_K8S_WORKER_STDIO_MCPS = "filesystem_local"
    $env:FILESYSTEM_MCP_ALLOWED_DIRECTORY = "/run/store/mcp-fs-workspace"
    $env:AGENTIC_K8S_WORKER_IMAGE = $WorkerImage
    & $Python main.py config/workflows/workflow_filesystem_smoke.yaml --quiet
    Assert-LastExit 0 "filesystem worker stdio smoke"
}

Write-Host ""
Write-Host "All local verification steps passed." -ForegroundColor Green
