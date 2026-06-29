# Run user agent harness packs (see wiki User-agent-harnesses).
param(
    [string[]]$HarnessDir = @(),
    [string]$Agent = "",
    [switch]$RunAll,
    [switch]$Json,
    [switch]$FailFast,
    [string]$Example = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolRoot = Split-Path -Parent $here
Set-Location $toolRoot

$py = if ($env:AGENTIC_PYTHON) { $env:AGENTIC_PYTHON } else { "python" }
$args = @("main.py")

if ($Example) { $args += @("--example", $Example) }
foreach ($d in $HarnessDir) {
    if ($d) { $args += @("--harness-dir", $d) }
}
if ($Agent) {
    $args += @("--harness-agent", $Agent)
} elseif ($RunAll) {
    $args += "--user-harness-run-all"
} else {
    Write-Error "Specify -Agent or -RunAll"
}

if ($Json) { $args += "--harness-json" }
if ($FailFast) { $args += "--harness-fail-fast" }

& $py @args
exit $LASTEXITCODE
