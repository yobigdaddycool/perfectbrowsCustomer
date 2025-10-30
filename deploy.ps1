# ============================================
# Setup SSH key passphrase automation
# ============================================
$sshKeyPassphrase = "Perfect123!"

Write-Host "Setting up SSH agent..."

# Create SSH_ASKPASS helper script - must output password to stdout
$askpassScript = @"
Write-Output '$sshKeyPassphrase'
"@
$askpassPath = "$PSScriptRoot\_askpass.ps1"
$askpassScript | Out-File -FilePath $askpassPath -Encoding ASCII -Force

# Start ssh-agent and capture output
$agentOutput = & "C:\Program Files\Git\usr\bin\ssh-agent.exe" 2>&1 | Out-String

# Parse and set environment variables
if ($agentOutput -match 'SSH_AUTH_SOCK=([^;]+)') {
    $env:SSH_AUTH_SOCK = $Matches[1]
}
if ($agentOutput -match 'SSH_AGENT_PID=(\d+)') {
    $env:SSH_AGENT_PID = $Matches[1]
}

Write-Host "Adding SSH key..."

# Convert Windows path to Unix path for bash
$sshAuthSockUnix = $env:SSH_AUTH_SOCK -replace '\\', '/' -replace '^([A-Z]):', '/mnt/$1'.ToLower()

# Use Git Bash to add the key with password piped - DON'T start new agent, use existing one
$bashCommand = "export SSH_AUTH_SOCK='$sshAuthSockUnix'; export SSH_AGENT_PID='$($env:SSH_AGENT_PID)'; echo '$sshKeyPassphrase' | ssh-add ~/.ssh/id_rsa"
$output = & "C:\Program Files\Git\bin\bash.exe" -c $bashCommand 2>&1
Write-Host "ssh-add output: $output"

# Verify key was added
Write-Host "Verifying key..."
$verifyCommand = "export SSH_AUTH_SOCK='$sshAuthSockUnix'; ssh-add -l"
$keyList = & "C:\Program Files\Git\bin\bash.exe" -c $verifyCommand 2>&1
Write-Host "Keys in agent: $keyList"

Start-Sleep -Seconds 1

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
# Cleanup: Stop ssh-agent and remove helper files
# ============================================
Write-Host "Cleaning up..."
if ($env:SSH_AGENT_PID) {
    & "C:\Program Files\Git\usr\bin\ssh-agent.exe" -k 2>&1 | Out-Null
}
Remove-Item -Path "$PSScriptRoot\_askpass.ps1" -Force -ErrorAction SilentlyContinue
Write-Host "Deployment complete!"
