# Create or reuse a local kind cluster with D:\run bind-mounted at /run/store.
$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$KindExe = Join-Path $ToolRoot ".tools\kind.exe"
$ClusterName = "agentic"

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
            if (-not (Test-Path "env:$key")) {
                Set-Item -Path "env:$key" -Value $value
            }
        }
    }
}

Import-DotEnv (Join-Path $ToolRoot ".env")

$HostPath = $env:AGENTIC_K8S_RUN_STORE_HOST_PATH
if ([string]::IsNullOrWhiteSpace($HostPath)) {
    $HostPath = $env:AGENTIC_RUN_STORE_PATH
}
if ([string]::IsNullOrWhiteSpace($HostPath)) {
    $HostPath = "D:/run"
}
$HostPath = $HostPath -replace '\\', '/'

New-Item -ItemType Directory -Force -Path ($HostPath -replace '/', '\') | Out-Null

$Template = Get-Content (Join-Path $ToolRoot "deploy\k8s\kind\cluster.yaml") -Raw
$Rendered = $Template.Replace("__RUN_STORE_HOST_PATH__", $HostPath)
$ConfigPath = Join-Path $env:TEMP "agentic-kind-cluster.yaml"
Set-Content -Path $ConfigPath -Value $Rendered -Encoding utf8

$existing = @(cmd.exe /c "`"$KindExe`" get clusters 2>nul")
if ($existing -contains $ClusterName) {
    Write-Host "kind cluster '$ClusterName' already exists."
} else {
    Write-Host "Creating kind cluster '$ClusterName' (host mount $HostPath -> /run/store) ..."
    & $KindExe create cluster --name $ClusterName --config $ConfigPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

kubectl config use-context "kind-$ClusterName"
Write-Host "kubectl context: kind-$ClusterName"
