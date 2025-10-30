$password = 'Perfect123!'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'C:\Program Files\Git\usr\bin\ssh-add.exe'
$psi.Arguments = '$env:USERPROFILE\.ssh\id_rsa'
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.EnvironmentVariables['SSH_AUTH_SOCK'] = '/tmp/ssh-siUUzPs7jHEg/agent.2031'

$process = [System.Diagnostics.Process]::Start($psi)
$process.StandardInput.WriteLine($password)
$process.StandardInput.Close()
$process.WaitForExit()
