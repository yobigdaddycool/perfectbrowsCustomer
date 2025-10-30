# ============================================
# Setup Git credentials for automation
# ============================================
$env:GIT_ASKPASS = "$PSScriptRoot\_git_askpass.ps1"
$env:GIT_USERNAME = "bigda"
$env:GIT_PASSWORD = "Perfect123!"

# Create temporary askpass helper script
@"
if (`$args[0] -match 'Username') {
  Write-Output `$env:GIT_USERNAME
} else {
  Write-Output `$env:GIT_PASSWORD
}
"@ | Out-File -FilePath "$PSScriptRoot\_git_askpass.ps1" -Encoding ASCII -Force

# push MAIN
git add -A
git commit -m "update db button"
git push -u origin main

# build
ng build --configuration production

# publish DEPLOY (worktree)
git fetch origin
git worktree remove .deploy_publish -f 2>$null
if (Test-Path .deploy_publish) { Remove-Item -Recurse -Force .deploy_publish }
git worktree add -B deploy .deploy_publish origin/deploy 2>$null
if ($LASTEXITCODE -ne 0) { git worktree add -B deploy .deploy_publish }

Get-ChildItem -Force .deploy_publish | ? { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path dist\*\browser\* -Destination .deploy_publish -Recurse -Force

# --- include extra files ---
# 1) if they exist at repo root (old location)
Get-ChildItem -File -Path test-db-connection.* -ErrorAction SilentlyContinue | % {
  Copy-Item -Path $_.FullName -Destination .deploy_publish -Force
}

# 2) NEW location under src/... -> copy to DEPLOY ROOT
$extraMap = @{
  "src\app\pages\testing-db\test-db-connection.php" = "test-db-connection.php"
  "src\app\pages\testing-db\test-db-connection.js"  = "test-db-connection.js"
}
foreach ($kv in $extraMap.GetEnumerator()) {
  if (Test-Path $kv.Key) {
    $dest = Join-Path ".deploy_publish" $kv.Value
    Copy-Item -Path $kv.Key -Destination $dest -Force
  }
}

cd .deploy_publish
git add -A
git commit -m "deploy: camera button update"
git push -u origin deploy
cd ..
git worktree remove .deploy_publish -f 2>$null

# ============================================
# Cleanup: Remove temporary askpass helper
# ============================================
Remove-Item -Path "$PSScriptRoot\_git_askpass.ps1" -Force -ErrorAction SilentlyContinue
