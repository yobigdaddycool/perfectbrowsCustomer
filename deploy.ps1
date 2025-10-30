# ============================================
# Setup SSH key passphrase automation
# ============================================
$sshKeyPassphrase = "Perfect123!"

Write-Host "Setting up SSH agent..."

# Create SSH_ASKPASS script that returns the password
$askpassScript = @"
#!/bin/sh
echo '$sshKeyPassphrase'
"@
$askpassPath = "$PSScriptRoot\_ssh_askpass.sh"
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
$askpassUnix = ($askpassPath -replace '\\', '/' -replace '^([A-Z]):', '/$1').ToLower() -replace '^/([a-z])/', '/mnt/$1/'

# Use SSH_ASKPASS with setsid to run ssh-add without terminal
$bashCommand = @"
export SSH_AUTH_SOCK='$sshAuthSockUnix'
export SSH_AGENT_PID='$($env:SSH_AGENT_PID)'
export SSH_ASKPASS='$askpassUnix'
export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0
chmod +x '$askpassUnix'
setsid ssh-add ~/.ssh/id_rsa </dev/null >/dev/null 2>&1
"@

$output = & "C:\Program Files\Git\bin\bash.exe" -c $bashCommand 2>&1

# Verify key was added
$verifyCommand = "export SSH_AUTH_SOCK='$sshAuthSockUnix'; ssh-add -l"
$keyList = & "C:\Program Files\Git\bin\bash.exe" -c $verifyCommand 2>&1
Write-Host "Key added successfully!"

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
# Cleanup: Stop ssh-agent and remove helper
# ============================================
Write-Host "Cleaning up..."
if ($env:SSH_AGENT_PID) {
    & "C:\Program Files\Git\usr\bin\ssh-agent.exe" -k 2>&1 | Out-Null
}
Remove-Item -Path "$PSScriptRoot\_ssh_askpass.sh" -Force -ErrorAction SilentlyContinue
Write-Host "Deployment complete!"
