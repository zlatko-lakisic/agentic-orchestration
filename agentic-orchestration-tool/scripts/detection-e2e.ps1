# One-shot live object_detection e2e (Windows PowerShell).
# Usage: .\scripts\detection-e2e.ps1
param(
    [switch]$Serve
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
Write-Host "Installing requirements-detection.txt ..."
python -m pip install -r requirements-detection.txt
$env:AGENTIC_DETECTION_E2E = "1"
if ($Serve) {
    $env:AGENTIC_DETECTION_E2E_SERVE = "1"
}
Write-Host "Running live detection e2e ..."
python -m pytest tests/test_object_detection_e2e.py -m integration -s
