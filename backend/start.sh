#!/bin/sh

echo "Starting Michelin Star Hunter Backend..."

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database (only if not already seeded)
echo "Seeding database..."
npx prisma db seed || echo "Seeding failed or already done"

# Start the application
echo "Starting the application..."
npm start