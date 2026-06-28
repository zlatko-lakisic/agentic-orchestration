# Apply namespace + shared run-store PVC (hostpath, nfs, or filestore).
# Set AGENTIC_K8S_RUN_STORE_VOLUME=hostpath|nfs|filestore (default: nfs).
$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DeployRoot = Join-Path $ToolRoot "deploy\k8s"

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

$Volume = $env:AGENTIC_K8S_RUN_STORE_VOLUME
if ([string]::IsNullOrWhiteSpace($Volume)) { $Volume = "nfs" }
$Volume = $Volume.Trim().ToLowerInvariant()
if ($Volume -notin @("filestore", "nfs", "hostpath")) {
    Write-Error "AGENTIC_K8S_RUN_STORE_VOLUME must be 'hostpath', 'filestore', or 'nfs', got '$Volume'"
}

Write-Host "Applying namespace ..."
kubectl apply -k (Join-Path $DeployRoot "base")

if ($Volume -eq "hostpath") {
    Write-Host "Applying hostPath run store (kind local bind mount) ..."
    kubectl apply -k (Join-Path $DeployRoot "run-store\hostpath")
    exit $LASTEXITCODE
}

if ($Volume -eq "nfs") {
    Write-Host "Applying NFS run store (kind/local) ..."
    kubectl apply -k (Join-Path $DeployRoot "run-store\nfs")
    exit $LASTEXITCODE
}

$Network = $env:AGENTIC_K8S_FILESTORE_NETWORK
if ([string]::IsNullOrWhiteSpace($Network)) { $Network = "default" }
$Network = $Network.Trim()
$Tier = $env:AGENTIC_K8S_FILESTORE_TIER
if ([string]::IsNullOrWhiteSpace($Tier)) { $Tier = "standard" }
$Tier = $Tier.Trim()
$ScPath = Join-Path $DeployRoot "run-store\filestore\storageclass.yaml"
$ScRendered = Get-Content $ScPath -Raw
$ScRendered = $ScRendered.Replace("__FILESTORE_NETWORK__", $Network)
$ScRendered = $ScRendered.Replace("__FILESTORE_TIER__", $Tier)

Write-Host "Applying Filestore StorageClass (network=$Network tier=$Tier) ..."
$ScRendered | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Applying Filestore PVC (1 TiB RWX) ..."
kubectl apply -f (Join-Path $DeployRoot "run-store\filestore\pvc.yaml")
