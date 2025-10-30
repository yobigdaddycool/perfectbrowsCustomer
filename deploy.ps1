# ============================================
# Setup SSH key passphrase automation
# ============================================
$sshKeyPassphrase = "Perfect123!"

Write-Host "Setting up SSH agent..."

# Clear any existing SSH_ASKPASS that might interfere
$env:SSH_ASKPASS = $null
$env:SSH_ASKPASS_REQUIRE = $null
$env:DISPLAY = $null

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

# Use expect-style approach with bash heredoc to provide password non-interactively
$bashCommand = @"
export SSH_AUTH_SOCK='$sshAuthSockUnix'
export SSH_AGENT_PID='$($env:SSH_AGENT_PID)'
export SSH_ASKPASS_REQUIRE=never
cat <<EOF | ssh-add ~/.ssh/id_rsa
$sshKeyPassphrase
EOF
"@

$output = & "C:\Program Files\Git\bin\bash.exe" -c $bashCommand 2>&1
if ($output) {
    Write-Host "Result: $output"
}

# Verify key was added
$verifyCommand = "export SSH_AUTH_SOCK='$sshAuthSockUnix'; ssh-add -l"
$keyList = & "C:\Program Files\Git\bin\bash.exe" -c $verifyCommand 2>&1
Write-Host "Keys loaded: $(if ($keyList -match 'SHA256') { '1 key(s)' } else { 'No keys' })"

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
# 1) Copy backend API files from root directory
Write-Host "Copying backend files..."
$backendFiles = @("api.php", "db-config.php", "test-db-connection.php")
foreach ($file in $backendFiles) {
  if (Test-Path $file) {
    Copy-Item -Path $file -Destination .deploy_publish -Force
    Write-Host "  [OK] Copied $file"
  } else {
    Write-Host "  [WARN] $file not found"
  }
}

# 2) Copy test-db-connection files if they exist at repo root (old location)
Get-ChildItem -File -Path test-db-connection.* -ErrorAction SilentlyContinue | % {
  Copy-Item -Path $_.FullName -Destination .deploy_publish -Force
}

# 3) NEW location under src/... -> copy to DEPLOY ROOT
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
# Cleanup: Stop ssh-agent
# ============================================
Write-Host "Cleaning up..."
if ($env:SSH_AGENT_PID) {
    & "C:\Program Files\Git\usr\bin\ssh-agent.exe" -k 2>&1 | Out-Null
}
Write-Host "Deployment complete!"
