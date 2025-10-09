# 0) Make sure main is up to date
git add -A
git commit -m "chore: source update"
git push -u origin main

# 1) Build production
ng build --configuration production

# 2) Create a local 'deploy' worktree (do NOT reference origin/deploy yet)
git worktree add -B deploy .deploy_publish

# 3) Populate worktree with the build
Get-ChildItem -Force .deploy_publish | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path dist\*\browser\* -Destination .deploy_publish -Recurse -Force

# 4) Commit + push the deploy branch
cd .deploy_publish
git add -A
git commit -m "deploy: first build"
git push -u origin deploy
cd ..

# 5) (Optional) remove the worktree folder
git worktree remove .deploy_publish -f
