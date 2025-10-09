# from your project root
ng build --configuration production

git fetch origin

# create the worktree (use remote deploy if it exists)
$hasRemoteDeploy = (git ls-remote --heads origin deploy) -ne ""
if ($hasRemoteDeploy) {
  git worktree add -B deploy .deploy_publish origin/deploy
} else {
  git worktree add -B deploy .deploy_publish
}

# wipe worktree (except .git) and copy build output
Get-ChildItem -Force .deploy_publish | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path dist\*\browser\* -Destination .deploy_publish -Recurse -Force

# commit + push deploy branch
cd .deploy_publish
git add -A
git commit -m "deploy: production build"
git push -u origin deploy
cd ..

# optional: remove local worktree folder
git worktree remove .deploy_publish -f
