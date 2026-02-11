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
        $firstStock = $stockResponse.data.content[0]
        Write-Host "✅ First Stock: $($firstStock.symbol) - $($firstStock.nameKr)"
        # Write-Host "runtime_verification_success"
    } else {
        Write-Host "⚠️ Stock List is empty."
        exit 1
    }
} catch {
    Write-Host "Get Stock List Failed: $_"
    exit 1
}

# 6. Portfolio Test
Write-Host "`n4. Creating Portfolio..."
$portfolioBody = @{
    name = "My Test Portfolio"
    description = "For verification"
    isPublic = $true
} | ConvertTo-Json

try {
    $portfolio = Invoke-RestMethod -Uri "$baseUrl/portfolios" -Method Post -Headers $headers -Body $portfolioBody -ContentType "application/json"
    $portfolioId = $portfolio.data.id
    Write-Host "✅ Portfolio Created: ID $portfolioId"
} catch {
    Write-Host "Portfolio Creation Failed: $_"
    exit 1
}

Write-Host "`n5. Adding Item to Portfolio..."
$itemBody = @{
    symbol = $firstStock.symbol
    quantity = 10
    averagePrice = 10000
    currency = "KRW"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/portfolios/$portfolioId/items" -Method Post -Headers $headers -Body $itemBody -ContentType "application/json"
    Write-Host "✅ Item Added."
} catch {
    Write-Host "Add Item Failed: $_"
    exit 1
}

Write-Host "`n6. Getting Portfolio Details..."
try {
    $myPortfolios = Invoke-RestMethod -Uri "$baseUrl/portfolios" -Method Get -Headers $headers
    $myPortfolio = $myPortfolios.data | Where-Object { $_.id -eq $portfolioId }

    if ($myPortfolio) {
        Write-Host "✅ Portfolio Found: $($myPortfolio.name)"
        if ($myPortfolio.items.Count -gt 0) {
            Write-Host "✅ Portfolio Items: $($myPortfolio.items.Count)"
            Write-Host "   Item Symbol: $($myPortfolio.items[0].symbol)"
            Write-Host "runtime_verification_success"
        } else {
            Write-Error "Items should not be empty!"
        }
    } else {
        Write-Error "Portfolio not found in list!"
    }
} catch {
    Write-Host "Get Portfolio Details Failed: $_"
    exit 1
}

Write-Host "`nVerification Complete!"
