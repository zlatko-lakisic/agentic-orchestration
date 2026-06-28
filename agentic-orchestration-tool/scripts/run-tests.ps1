# Run the default unit test tier (same as GitHub Actions CI).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
python -m pip install -q -r requirements.txt -r requirements-dev.txt
if ($args.Count -gt 0) {
  python -m pytest @args
} else {
  python -m pytest
}
