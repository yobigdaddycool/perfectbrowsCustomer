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

cd .deploy_publish
git add -A
git commit -m "deploy: update db button"
git push -u origin deploy
cd ..
git worktree remove .deploy_publish -f 2>$null
