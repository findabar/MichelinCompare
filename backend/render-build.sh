#!/bin/bash

set -e

echo "🔧 Installing dependencies..."
npm install

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🏗️ Building application..."
npm run build

echo "📊 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed || echo "Seeding failed or already done"

echo "✅ Build completed successfully!"