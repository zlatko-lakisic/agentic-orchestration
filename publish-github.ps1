param(
  [string]$RepoName = "",
  [ValidateSet("public", "private")]
  [string]$Visibility = "private",
  [switch]$AllowDirty,
  [switch]$AutoCommit,
  [string]$CommitMessage = "Publish project",
  [switch]$SkipPush,
  [switch]$SkipWikiPublish,
  [string]$WikiDir = "../agentic-orchestration.wiki",
  [string]$WikiBranch = "main",
  [bool]$WikiAutoCommit = $true,
  [string]$WikiCommitMessage = "Update wiki"
)

$ErrorActionPreference = "Stop"

# Windows PowerShell 5.1 compatible (no ?? or $env:$dynamicName); PowerShell 7+ has those shortcuts.
function Get-EnvOrEmpty([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($null -eq $v) { return "" }
  return [string]$v
}

function Load-RootDotEnv {
  $envPath = Join-Path (Get-Location) ".env"
  if (-not (Test-Path -Path $envPath)) { return }
  $raw = Get-Content -Path $envPath -Raw
  foreach ($line in $raw -split "`n") {
    $trimmed = $line.Trim()
    if (-not $trimmed) { continue }
    if ($trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -le 0) { continue }
    $key = $trimmed.Substring(0, $eq).Trim()
    if (-not $key) { continue }
    if (Test-Path -LiteralPath ("Env:{0}" -f $key)) { continue }
    $val = $trimmed.Substring($eq + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    Set-Item -LiteralPath ("Env:{0}" -f $key) -Value $val
  }
}

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

# Allow publish defaults from repo-root .env (script-only; does not affect tool/web env loading).
Load-RootDotEnv

if (-not $RepoName.Trim()) { $RepoName = (Get-EnvOrEmpty "GITHUB_REPO_NAME").Trim() }
if (-not $RepoName.Trim()) { $RepoName = (Get-EnvOrEmpty "AGENTIC_GITHUB_REPO_NAME").Trim() }
if ($Visibility -eq "private") {
  $gv = (Get-EnvOrEmpty "GITHUB_VISIBILITY").Trim()
  if ($gv) { $Visibility = $gv }
}
if ($CommitMessage -eq "Publish project") {
  $gm = (Get-EnvOrEmpty "GITHUB_COMMIT_MESSAGE").Trim()
  if ($gm) { $CommitMessage = $gm }
}
if (-not $AllowDirty -and ((Get-EnvOrEmpty "GITHUB_ALLOW_DIRTY").Trim() -eq "1")) { $AllowDirty = $true }
if (-not $AutoCommit -and ((Get-EnvOrEmpty "GITHUB_AUTO_COMMIT").Trim() -eq "1")) { $AutoCommit = $true }
if (-not $SkipPush -and ((Get-EnvOrEmpty "GITHUB_SKIP_PUSH").Trim() -eq "1")) { $SkipPush = $true }
if (-not $SkipWikiPublish -and ((Get-EnvOrEmpty "GITHUB_PUBLISH_WIKI").Trim() -match "^(0|false|no|off)$")) { $SkipWikiPublish = $true }
if ($WikiDir -eq "../agentic-orchestration.wiki") {
  $wd = (Get-EnvOrEmpty "GITHUB_WIKI_DIR").Trim()
  if ($wd) { $WikiDir = $wd }
}
if ($WikiBranch -eq "main") {
  $wb = (Get-EnvOrEmpty "GITHUB_WIKI_BRANCH").Trim()
  if ($wb) { $WikiBranch = $wb }
}
if (-not $WikiAutoCommit -and ((Get-EnvOrEmpty "GITHUB_WIKI_AUTO_COMMIT").Trim() -eq "1")) { $WikiAutoCommit = $true }
if ($WikiCommitMessage -eq "Update wiki") {
  $wm = (Get-EnvOrEmpty "GITHUB_WIKI_COMMIT_MESSAGE").Trim()
  if ($wm) { $WikiCommitMessage = $wm }
}

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

# Create repo on GitHub with remote name `github` so `origin` (e.g. internal server) is unchanged.
$ghOwner = (gh api user -q .login).Trim()
if (-not $ghOwner) { throw "Could not resolve GitHub username. Run: gh auth login" }
$githubRemoteName = "github"
$githubRemoteUrl = "https://github.com/" + $ghOwner + "/" + $RepoName + ".git"

$createArgs = @("repo", "create", $RepoName, "--source", ".", ("--" + $Visibility), "--remote", $githubRemoteName)
$createOut = (& gh @createArgs 2>&1 | ForEach-Object { $_ })
if ($LASTEXITCODE -ne 0) {
  $createMsg = ($createOut | Out-String)
  if ($createMsg -match "already exists|Name already exists") {
    Write-Host "GitHub repo already exists; ensuring git remote '$githubRemoteName' points at GitHub."
    if (@(git remote) -contains $githubRemoteName) {
      Run ("git remote set-url " + $githubRemoteName + " " + $githubRemoteUrl)
    } else {
      Run ("git remote add " + $githubRemoteName + " " + $githubRemoteUrl)
    }
  } else {
    throw ("gh repo create failed: " + $createMsg.Trim())
  }
}

if (-not $SkipPush) {
  # Push current branch to GitHub (not necessarily `origin`).
  Run ("git push -u " + $githubRemoteName + " " + $currentBranch)
  Write-Host ""
  Write-Host ("Done. Open the repo with: gh repo view " + $RepoName + " --web")
} else {
  Write-Host "Repo created and remote set, push skipped."
}

if (-not $SkipWikiPublish) {
  $wikiPath = Resolve-Path -Path (Join-Path $top $WikiDir) -ErrorAction SilentlyContinue
  if (-not $wikiPath) {
    Write-Host ("Wiki directory not found (" + $WikiDir + "). Skipping wiki publish.")
    exit 0
  }
  $wikiRoot = $wikiPath.Path
  if (-not (Test-Path -Path (Join-Path $wikiRoot ".git"))) {
    Write-Host ("Wiki directory is not a git repository (" + $wikiRoot + "). Skipping wiki publish.")
    exit 0
  }
  Write-Host ""
  Write-Host ("Publishing wiki repo: " + $wikiRoot)
  Push-Location $wikiRoot
  try {
    $wikiStatus = (git status --porcelain)
    if ($wikiStatus) {
      if ($WikiAutoCommit) {
        Run "git add -A"
        Run ("git commit -m " + ('"' + $WikiCommitMessage.Replace('"','\"') + '"'))
      } else {
        Write-Host "Wiki has uncommitted changes and -WikiAutoCommit was not set. Skipping wiki push."
        exit 0
      }
    }
    Run ("git push -u origin " + $WikiBranch)
  } finally {
    Pop-Location
  }
}

