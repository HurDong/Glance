#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"
EMAIL="verify_user_$(date +%s)@glance.com"
PASSWORD="password123!"
NICKNAME="VerifyUser"

echo "1. Signup..."
curl -v -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"nickname\": \"$NICKNAME\"}"

echo -e "\n\n2. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed or Token not found"
  exit 1
fi

echo "✅ Access Token: $ACCESS_TOKEN"

echo -e "\n3. Get Stock List (KOSPI)..."
STOCK_RESPONSE=$(curl -s -X GET "$BASE_URL/stocks?page=0&size=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Stock Response Sample: ${STOCK_RESPONSE:0:200}..."

if [[ "$STOCK_RESPONSE" == *"Samsung"* ]] || [[ "$STOCK_RESPONSE" == *"content"* ]]; then
    echo "✅ Stock List verification passed!"
else
    echo "⚠️ Stock List might be empty or failed. Check manually."
fi
