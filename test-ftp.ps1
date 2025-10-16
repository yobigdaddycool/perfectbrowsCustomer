# FTP Test Connection Script for BlueHost
# Save this as test-ftp.ps1 and run in PowerShell

param(
    [string]$FtpHost = "ftp.ich.rqh.mybluehost.me",
    [string]$FtpUser = "perfect@ich.rqh.mybluehost.me", 
    [string]$FtpPassword = "Perfect123!",
    [int]$FtpPort = 21
)

Write-Host "=== Testing FTP Connection to BlueHost ===" -ForegroundColor Cyan
Write-Host "Host: $FtpHost" -ForegroundColor Yellow
Write-Host "User: $FtpUser" -ForegroundColor Yellow
Write-Host "Port: $FtpPort" -ForegroundColor Yellow
Write-Host ""

try {
    # Create FTP Web Request
    $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost/")
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
    $ftpRequest.EnableSsl = $false  # Set to $true if you need FTPS
    $ftpRequest.UsePassive = $true
    $ftpRequest.Timeout = 30000  # 30 seconds timeout

    Write-Host "Attempting FTP connection..." -ForegroundColor Green
    
    # Get FTP response
    $response = $ftpRequest.GetResponse()
    $responseStream = $response.GetResponseStream()
    $streamReader = New-Object System.IO.StreamReader($responseStream)
    
    Write-Host "✅ FTP Connection SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Response Status: $($response.StatusDescription)" -ForegroundColor Green
    
    # Try to list directory contents
    Write-Host "`n=== Directory Listing ===" -ForegroundColor Cyan
    $directoryContents = $streamReader.ReadToEnd()
    
    if ([string]::IsNullOrWhiteSpace($directoryContents)) {
        Write-Host "Directory is empty or no permissions to list" -ForegroundColor Yellow
    } else {
        $contentsArray = $directoryContents -split "`r`n" | Where-Object { $_ }
        foreach ($item in $contentsArray) {
            Write-Host "  📁 $item" -ForegroundColor White
        }
    }
    
    # Clean up
    $streamReader.Close()
    $response.Close()
    
    Write-Host "`n✅ FTP Test Completed Successfully!" -ForegroundColor Green
    
} catch [System.Net.WebException] {
    Write-Host "❌ FTP Connection FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response -ne $null) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Unexpected Error!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full Error: $($_.Exception.ToString())" -ForegroundColor Red
}

Write-Host "`n=== FTP Test Complete ===" -ForegroundColor Cyan