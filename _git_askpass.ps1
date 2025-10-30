if ($args[0] -match 'Username') {
  Write-Output $env:GIT_USERNAME
} else {
  Write-Output $env:GIT_PASSWORD
}
