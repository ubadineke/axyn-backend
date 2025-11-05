#!/bin/bash

# Quick script to get JWT token from backend
# Usage: ./scripts/get-jwt-token.sh <privy_auth_token>

if [ -z "$1" ]; then
  echo "❌ Privy auth token required"
  echo ""
  echo "Usage: ./scripts/get-jwt-token.sh <privy_auth_token>"
  echo ""
  echo "To get a Privy auth token:"
  echo "  1. Open mobile app"
  echo "  2. Login with Privy"
  echo "  3. Check network logs for POST /auth/login request"
  echo "  4. Copy the 'authToken' from request body"
  exit 1
fi

PRIVY_TOKEN="$1"
API_URL="${API_URL:-http://localhost:3000}"

echo "🔑 Logging in to get JWT token..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"authToken\": \"$PRIVY_TOKEN\"}")

# Extract JWT token from response
JWT_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ JWT Token obtained!"
echo ""
echo "Copy this command to seed agents:"
echo ""
echo "JWT_TOKEN=\"$JWT_TOKEN\" npx ts-node scripts/seed-test-agents.ts"
