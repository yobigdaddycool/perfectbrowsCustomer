# push-to-github.ps1
# Purpose: Push local changes to GitHub:
#   1) Commit & push MAIN (source)
#   2) Build Angular (prod)
#   3) Publish build output to DEPLOY branch via a git worktree
#
# NOTE: This script does NOT SSH to Bluehost. After it finishes, run the pull yourself on Bluehost:
#   ssh ichrqhmy@ich.rqh.mybluehost.me "cd ~/public_html/<website_id> && git fetch origin && git checkout -B deploy origin/deploy && git pull --ff-only"
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\push-to-github.ps1
#
# Tips:
#   - If your remote is not set: git remote add origin git@github.com:yobigdaddycool/perfectbrowsCustomer.git

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Warn($m){ Write-Host "!! $m" -ForegroundColor Yellow }
function Step($n,$t){ Write-Host "`n[$n] $t" -ForegroundColor Magenta }

# -------- Inputs --------
$CommitMessage = Read-Host "Commit message for MAIN (default: 'chore: source update')"
if ([string]::IsNullOrWhiteSpace($CommitMessage)) { $CommitMessage = "chore: source update" }

# -------- Guards --------
if (!(Test-Path ".\angular.json")) { throw "Not an Angular project root. cd into your app folder and run again." }
try { git rev-parse --is-inside-work-tree | Out-Null } catch { throw "This folder is not a git repository." }

# -------- Remote sanity --------
try {
  $origin = git remote get-url origin
  Info "Remote 'origin' -> $origin"
} catch {
  Warn "No 'origin' remote detected. Add it first, e.g.:"
  Write-Host "  git remote add origin git@github.com:yobigdaddycool/perfectbrowsCustomer.git"
  throw "Missing origin remote."
}

# -------- Determine project/dist path --------
Step 1 "Detecting Angular project/dist path"
$angular = Get-Content .\angular.json -Raw | ConvertFrom-Json
$projectName = $angular.defaultProject
if (-not $projectName -and $angular.projects) {
  $projectName = ($angular.projects.PSObject.Properties.Name | Select-Object -First 1)
}
if (-not $projectName) { $projectName = (Get-Item .).Name }

$distPath = Join-Path -Path "dist" -ChildPath $projectName
$browserPath = Join-Path -Path $distPath -ChildPath "browser"

Info "Project: $projectName"
Info "Browser dist path: $browserPath"

# -------- Ensure .deploy_publish & dist/ are ignored on MAIN --------
Step 2 "Ensure .deploy_publish and dist/ are ignored on MAIN"
# -------- Ensure .deploy_publish and dist/ are ignored on MAIN --------
$ignoreLines = @(".deploy_publish/","dist/")
if (Test-Path .\.gitignore) {
  foreach ($ln in $ignoreLines) {
    if (-not (Select-String -Path .\.gitignore -SimpleMatch $ln -Quiet)) {
      Add-Content .\.gitignore "`r`n$ln"
    }
  }
} else {
  ($ignoreLines -join "`r`n") | Set-Content .\.gitignore -Encoding UTF8
}

# Untrack if accidentally committed (suppress git's stderr cleanly)
$tracked = $false
cmd /c "git ls-files --error-unmatch .deploy_publish >nul 2>nul"
if ($LASTEXITCODE -eq 0) { $tracked = $true }

if ($tracked) {
  git rm -r --cached .deploy_publish | Out-Null
  git add .gitignore | Out-Null
  git commit -m "chore: ignore deploy worktree" 2>$null | Out-Null
}
# -------- Commit & push MAIN --------
Step 3 "Commit & push MAIN"
try { git switch -c main 2>$null | Out-Null } catch { git switch main | Out-Null }
git add -A | Out-Null
try {
  git commit -m $CommitMessage | Out-Null
} catch {
  Warn "Nothing to commit on MAIN (working tree clean)."
}
git push -u origin main

# -------- Build production --------
Step 4 "Building Angular (production)"
ng build --configuration production
if (!(Test-Path $browserPath)) {
  Warn "Expected $browserPath not found. Falling back to glob dist\*\browser\*"
  $fallback = (Get-ChildItem -Directory -Path dist | ForEach-Object { Join-Path $_.FullName "browser" } | Where-Object { Test-Path $_ })
  if ($fallback.Count -eq 0) { throw "Build output not found under dist/*/browser" }
  $browserPath = $fallback[0]
  Info "Using: $browserPath"
}

# -------- Create/attach deploy worktree --------
Step 5 "Create/attach deploy worktree"
$deployDir = ".\.deploy_publish"
# If exists but not a worktree, remove
if (Test-Path $deployDir -and !(Test-Path (Join-Path $deployDir ".git"))) {
  Warn "$deployDir exists but is not a git worktree. Removing."
  Remove-Item $deployDir -Recurse -Force
}
$hasRemoteDeploy = ((git ls-remote --heads origin deploy) 2>$null) -ne $null
if ($hasRemoteDeploy) {
  git worktree add -B deploy $deployDir origin/deploy | Out-Null
} else {
  git worktree add -B deploy $deployDir | Out-Null
}

# -------- Publish build into worktree --------
Step 6 "Publishing build to DEPLOY branch"
Get-ChildItem -Force $deployDir | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $browserPath "*") -Destination $deployDir -Recurse -Force

Push-Location $deployDir
git add -A
git commit -m ("deploy: {0} - {1}" -f (Get-Date -Format s), $CommitMessage) 2>$null | Out-Null
git push -u origin deploy
Pop-Location

# -------- Clean up local worktree folder --------
Step 7 "Cleaning local worktree folder"
git worktree remove $deployDir -f 2>$null

Write-Host "`nDone. Now SSH to Bluehost and run:" -ForegroundColor Green
Write-Host "  cd ~/public_html/<website_id> && git fetch origin && git checkout -B deploy origin/deploy && git pull --ff-only" -ForegroundColor Green
