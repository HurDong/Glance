$baseUrl = "http://localhost:8080/api/v1"
$email = "verify_user_$(Get-Date -Format 'yyyyMMddHHmmss')@glance.com"
$password = "password123!"
$nickname = "VerifyUser_$(Get-Date -Format 'mmss')"

Write-Host "1. Signup..."
$signupBody = @{
    email = $email
    password = $password
    nickname = $nickname
} | ConvertTo-Json

try {
    $signupResponse = Invoke-RestMethod -Uri "$baseUrl/auth/signup" -Method Post -Body $signupBody -ContentType "application/json"
    Write-Host "Signup Success: $($signupResponse | ConvertTo-Json -Depth 2)"
} catch {
    Write-Host "Signup Failed: $_"
    # Proceed to login anyway if user exists
}

Write-Host "`n2. Login..."
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $accessToken = $loginResponse.accessToken
    
    if (-not [string]::IsNullOrEmpty($accessToken)) {
        Write-Host "✅ Login Success. Token: $accessToken"
    } else {
        Write-Host "❌ Login Failed. No Token."
        exit 1
    }
} catch {
    Write-Host "Login Request Failed: $_"
    exit 1
}

Write-Host "`n3. Get Stock List (KOSPI)..."
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/stocks?page=0&size=5&sort=id,asc" -Method Get -Headers $headers
    
    Write-Host "Stock Count on Page: $($stockResponse.data.content.Count)"
    if ($stockResponse.data.content.Count -gt 0) {
        Write-Host "✅ First Stock: $($stockResponse.data.content[0].symbol) - $($stockResponse.data.content[0].nameKr)"
        Write-Host "runtime_verification_success"
    } else {
        Write-Host "⚠️ Stock List is empty."
    }
} catch {
    Write-Host "Get Stock List Failed: $_"
}
