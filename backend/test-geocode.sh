#!/bin/bash

# Test script for geocoding API
# This script will:
# 1. Get an auth token
# 2. Call the geocoding API for 3-star restaurants

echo "🔐 Logging in to get auth token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jondoz@gmail.com","password":"testtest"}' \
  | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token. Make sure:"
  echo "   1. Backend server is running on port 3001 (npm run dev)"
  echo "   2. Admin user exists with email: jondoz@gmail.com"
  exit 1
fi

echo "✅ Got auth token: ${TOKEN:0:20}..."
echo ""
echo "🌍 Calling geocoding API for 3-star restaurants..."
echo ""

curl -X POST http://localhost:3001/api/admin/geocode-restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"filter": "stars", "starLevel": 3}' \
  | jq '.'

echo ""
echo "✅ Test complete!"
