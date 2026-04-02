param(
  [string]$RepoName = "",
  [ValidateSet("public", "private")]
  [string]$Visibility = "private",
  [switch]$AllowDirty,
  [switch]$AutoCommit,
  [string]$CommitMessage = "Publish project",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$name'. Install it and ensure it's on PATH."
  }
}

function Run($cmd) {
  Write-Host ("`n> " + $cmd)
  Invoke-Expression $cmd
}

Require-Command git
Require-Command gh

# Ensure we're in a git repo root (or at least a git repo).
try {
  $top = (git rev-parse --show-toplevel).Trim()
} catch {
  throw "Not a git repository (or git cannot find the repo). Run this from inside your repo."
}

Set-Location $top
Write-Host ("Repo root: " + $top)

# Auth check (will error with a helpful message if not logged in)
try {
  gh auth status | Out-Null
} catch {
  throw "GitHub CLI not authenticated. Run: gh auth login"
}

# Optionally commit changes
$status = (git status --porcelain)
if ($status -and -not $AllowDirty) {
  if ($AutoCommit) {
    Run "git add -A"
    Run ("git commit -m " + ('"' + $CommitMessage.Replace('"','\"') + '"'))
  } else {
    throw "Working tree is not clean. Commit/stash changes, or rerun with -AllowDirty or -AutoCommit."
  }
}

if (-not $RepoName.Trim()) {
  $RepoName = Read-Host "GitHub repo name (e.g. agentic-orchestration)"
}
if (-not $RepoName.Trim()) {
  throw "RepoName is required."
}

$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $currentBranch) { $currentBranch = "main" }

Write-Host ""
Write-Host "About to create and publish:"
Write-Host ("- name: " + $RepoName)
Write-Host ("- visibility: " + $Visibility)
Write-Host ("- branch: " + $currentBranch)
Write-Host ("- skip push: " + [bool]$SkipPush)
Write-Host ""

$confirm = Read-Host "Proceed? (y/N)"
if ($confirm.ToLower().Trim() -ne "y") {
  Write-Host "Cancelled."
  exit 0
}

# Create repo on GitHub; keep it simple and rely on gh defaults for owner.
Run ("gh repo create " + $RepoName + " --source . --" + $Visibility + " --remote origin")

if (-not $SkipPush) {
  # Push current branch and set upstream.
  Run ("git push -u origin " + $currentBranch)
  Write-Host ""
  Write-Host "Done. Open the repo with: gh repo view --web"
} else {
  Write-Host "Repo created and remote set, push skipped."
}

