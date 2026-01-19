#!/bin/bash

# Test Error Detection Script
# This script helps verify the intelligence service is working correctly

set -e

SERVICE_URL="${1:-http://localhost:3003}"

echo "🧪 Testing Intelligence Service"
echo "================================"
echo "Service URL: $SERVICE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health check..."
HEALTH=$(curl -s "$SERVICE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
  echo "✅ Health check passed"
  echo "$HEALTH" | jq '.'
else
  echo "❌ Health check failed"
  echo "$HEALTH"
  exit 1
fi

echo ""

# Test 2: Status Check
echo "2️⃣  Testing status endpoint..."
STATUS=$(curl -s "$SERVICE_URL/status")
if echo "$STATUS" | grep -q "success"; then
  echo "✅ Status check passed"
  echo "$STATUS" | jq '.'
else
  echo "❌ Status check failed"
  echo "$STATUS"
  exit 1
fi

echo ""

# Test 3: Stats Check
echo "3️⃣  Testing stats endpoint..."
STATS=$(curl -s "$SERVICE_URL/stats")
if echo "$STATS" | grep -q "success"; then
  echo "✅ Stats check passed"
  echo "$STATS" | jq '.'
else
  echo "❌ Stats check failed"
  echo "$STATS"
  exit 1
fi

echo ""

# Test 4: Manual Trigger
echo "4️⃣  Triggering manual check..."
echo "⚠️  This will check Railway logs and may create GitHub issues if errors are found"
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  TRIGGER=$(curl -s -X POST "$SERVICE_URL/trigger-check")
  if echo "$TRIGGER" | grep -q "success"; then
    echo "✅ Manual trigger successful"
    echo "$TRIGGER" | jq '.'
    echo ""
    echo "⏳ Check is running in the background..."
    echo "   View logs to see progress"
    echo "   Check GitHub issues for any created issues"
  else
    echo "❌ Manual trigger failed"
    echo "$TRIGGER"
    exit 1
  fi
else
  echo "⏭️  Skipped manual trigger"
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Check Railway logs for any errors"
echo "2. Monitor GitHub issues for new automated issues"
echo "3. Verify GitHub Actions are triggered"
echo "4. Check that Claude comments on issues"
echo ""
