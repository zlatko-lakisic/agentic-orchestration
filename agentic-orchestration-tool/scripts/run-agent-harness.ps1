# Run platform agent harness (see wiki Agent-harness-roadmap).
param(
    [ValidateSet("static", "connectivity", "smoke", "capability", "l0", "l1", "l2", "l3")]
    [string]$Tier = "static",
    [string]$Filter = "",
    [string]$Agent = "",
    [int]$MaxAgents = 0,
    [switch]$Json,
    [switch]$FailFast
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolRoot = Split-Path -Parent $here
Set-Location $toolRoot

$py = if ($env:AGENTIC_PYTHON) { $env:AGENTIC_PYTHON } else { "python" }
$args = @("main.py")

if ($Agent) {
    $args += @("--harness-agent", $Agent, "--harness-tier", $Tier)
} else {
    $args += @("--harness-batch", "--harness-tier", $Tier)
    if ($Filter) { $args += @("--harness-filter", $Filter) }
    if ($MaxAgents -gt 0) { $args += @("--harness-max-agents", "$MaxAgents") }
}

if ($Json) { $args += "--harness-json" }
if ($FailFast) { $args += "--harness-fail-fast" }

& $py @args
exit $LASTEXITCODE
