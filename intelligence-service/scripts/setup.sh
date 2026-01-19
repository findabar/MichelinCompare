#!/bin/bash

# Intelligence Service Setup Script
set -e

echo "🚀 Intelligence Service Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ -f .env ]; then
  echo "✅ .env file found"
else
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and fill in your values before continuing"
  exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo ""
echo "🔨 Generating Prisma client..."
npx prisma generate

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  echo "   Please check your DATABASE_URL in .env"
  exit 1
fi

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review your .env configuration"
echo "2. Test locally: npm run dev"
echo "3. Deploy to Railway: railway up"
echo ""
