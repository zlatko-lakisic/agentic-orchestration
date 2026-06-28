# Run the default unit test tier (same as GitHub Actions CI).
$ErrorActionPreference = "Stop"
$ToolRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ToolRoot

python -m pip install -q -r requirements-test.txt

if ($args.Count -gt 0) {
  python -m pytest @args
} else {
  python -m pytest
}
exit $LASTEXITCODE
