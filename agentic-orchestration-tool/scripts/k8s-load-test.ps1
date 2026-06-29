# K5.4 load test: N parallel K8s workflow runs (stub worker, no LLM).
# Usage:
#   powershell -File scripts/k8s-load-test.ps1 [-Runs 5] [-WarmPool]
# Requires kind cluster + run-store PVC + stub worker image loaded.
param(
    [int]$Runs = 5,
    [switch]$WarmPool
)

$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ToolRoot

$Python = Join-Path $ToolRoot ".venv\Scripts\python.exe"
$KindExe = Join-Path $ToolRoot ".tools\kind.exe"
$StubImage = "agentic-orchestrator-worker-stub:ci"
$Workflow = "config/workflows/workflow_brainstorm.yaml"

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

Import-DotEnv (Join-Path $ToolRoot ".env")

$HostPath = ($env:AGENTIC_K8S_RUN_STORE_HOST_PATH -replace '\\', '/')
if ([string]::IsNullOrWhiteSpace($HostPath)) { $HostPath = "D:/run" }

$envBlock = @{
    AGENTIC_EXECUTION_BACKEND = "kubernetes"
    AGENTIC_RUN_STORE_PATH = ($HostPath -replace '/', '\')
    AGENTIC_K8S_RUN_STORE_HOST_PATH = $HostPath
    AGENTIC_K8S_RUN_STORE_VOLUME = "hostpath"
    AGENTIC_K8S_WORKER_IMAGE = $StubImage
    AGENTIC_K8S_NAMESPACE = "agentic-orchestration"
    AGENTIC_K8S_RUN_STORE_PVC = "agentic-run-store"
    AGENTIC_K8S_RUN_STORE_MOUNT = "/run/store"
    AGENTIC_LOG_FORMAT = "json"
}
if ($WarmPool) { $envBlock["AGENTIC_K8S_WARM_POOL_ENABLED"] = "1" }

$jobs = 1..$Runs | ForEach-Object {
    $idx = $_
    Start-Job -ScriptBlock {
        param($ToolRoot, $Python, $Workflow, $Idx, $EnvVars)
        Set-Location $ToolRoot
        foreach ($k in $EnvVars.Keys) { Set-Item -Path "env:$k" -Value $EnvVars[$k] }
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        & $Python main.py $Workflow --quiet 2>&1 | Out-Null
        $code = $LASTEXITCODE
        $sw.Stop()
        [pscustomobject]@{ Index = $Idx; Seconds = $sw.Elapsed.TotalSeconds; ExitCode = $code }
    } -ArgumentList $ToolRoot, $Python, $Workflow, $idx, $envBlock
}

Write-Host "Load test: $Runs parallel runs of $Workflow (stub worker, warm_pool=$WarmPool)"
$timings = [System.Collections.Generic.List[double]]::new()
$failed = 0
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job -Force

foreach ($r in $results) {
    if ($r.ExitCode -ne 0) { $failed++ }
    $timings.Add([double]$r.Seconds)
    Write-Host ("  run {0}: {1:N2}s exit {2}" -f $r.Index, $r.Seconds, $r.ExitCode)
}

$sorted = $timings | Sort-Object
$p50 = $sorted[[int][math]::Floor(($sorted.Count - 1) * 0.5)]
$p95 = $sorted[[int][math]::Floor(($sorted.Count - 1) * 0.95)]
$avg = ($timings | Measure-Object -Average).Average

Write-Host ""
Write-Host "Summary ($Runs runs, $failed failed)"
Write-Host ("  p50 step-run wall time: {0:N2}s" -f $p50)
Write-Host ("  p95 step-run wall time: {0:N2}s" -f $p95)
Write-Host ("  avg: {0:N2}s" -f $avg)

if ($failed -gt 0) { exit 1 }
