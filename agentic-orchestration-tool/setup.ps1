# One-time setup: Python venv, dependencies, and .env from .env.example
# Run from repo root:  .\setup.ps1
# Or:  powershell -ExecutionPolicy Bypass -File .\setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    Write-Error "Python launcher 'py' not found. Install Python 3.12 and try again."
    exit 1
}

Write-Host "Creating virtual environment (.venv) with Python 3.12..."
py -3.12 -m venv .venv

$pyExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    Write-Error "Failed to create .venv"
    exit 1
}

Write-Host "Upgrading pip..."
& $pyExe -m pip install --upgrade pip

Write-Host "Installing dependencies..."
& $pyExe -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")

$envExamplePath = Join-Path $PSScriptRoot ".env.example"
$dotEnvPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $dotEnvPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $dotEnvPath
        Write-Host "Created .env from .env.example - edit OPENAI_API_KEY and Ollama vars if needed."
    }
} else {
    Write-Host ".env already exists - skipped copy."
}

Write-Host ""
Write-Host "Setup finished. Next:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host '  $env:PYTHONUTF8=1'
Write-Host "  python main.py"
