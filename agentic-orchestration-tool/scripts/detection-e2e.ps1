# One-shot live object_detection e2e (Windows PowerShell).
# Usage: .\scripts\detection-e2e.ps1 [-Gpu] [-Serve]
param(
    [switch]$Serve,
    [switch]$Gpu
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
if ($Gpu) {
    Write-Host "Installing requirements-detection-gpu.txt (onnxruntime-gpu + cuDNN) ..."
    python -m pip uninstall -y onnxruntime 2>$null
    python -m pip install -r requirements-detection-gpu.txt
} else {
    Write-Host "Installing requirements-detection.txt ..."
    python -m pip install -r requirements-detection.txt
}
$env:AGENTIC_DETECTION_E2E = "1"
if ($Serve) {
    $env:AGENTIC_DETECTION_E2E_SERVE = "1"
}
Write-Host "Running live detection e2e ..."
python -m pytest tests/test_object_detection_e2e.py -m integration -s
