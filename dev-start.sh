#!/bin/bash

set -e  # Exit on any error

echo "🌟 Starting Michelin Star Hunter Development Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists psql; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Check if ports are available
if port_in_use 3000; then
    echo "⚠️  Port 3000 is in use. Attempting to free it..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if port_in_use 3001; then
    echo "⚠️  Port 3001 is in use. Attempting to free it..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start PostgreSQL if not running
echo "🗃️  Checking PostgreSQL..."
if ! pg_isready >/dev/null 2>&1; then
    echo "🔄 Starting PostgreSQL..."
    if command_exists brew; then
        brew services start postgresql
    elif command_exists systemctl; then
        sudo systemctl start postgresql
    else
        echo "⚠️  Please start PostgreSQL manually"
    fi

    # Wait for PostgreSQL to start
    for i in {1..30}; do
        if pg_isready >/dev/null 2>&1; then
            break
        fi
        echo "   Waiting for PostgreSQL... ($i/30)"
        sleep 1
    done
fi

# Create database if it doesn't exist
echo "📂 Setting up database..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw michelin_star_hunter; then
    echo "   Creating database..."
    createdb michelin_star_hunter
fi

# Setup backend
echo "⚙️  Setting up backend..."
cd backend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
fi

# Setup environment
if [ ! -f ".env" ]; then
    echo "   Creating environment file..."
    cp .env.example .env
    # Update database URL for current user
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/username:password@localhost/${USER}:@localhost/" .env
    else
        sed -i "s/username:password@localhost/${USER}:@localhost/" .env
    fi
fi

# Run migrations
echo "   Running database migrations..."
npx prisma migrate dev --name init >/dev/null 2>&1 || npx prisma db push >/dev/null 2>&1

# Generate Prisma client
echo "   Generating Prisma client..."
npx prisma generate >/dev/null 2>&1

# Seed database
echo "   Seeding database..."
npx prisma db seed >/dev/null 2>&1 || echo "   Database already seeded or seeding failed"

cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
fi

cd ..

# Start services
echo "🚀 Starting services..."

# Start backend in background
echo "   Starting backend on port 3001..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        break
    fi
    echo "   Waiting for backend... ($i/30)"
    sleep 1
done

# Start frontend
echo "   Starting frontend on port 3000..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        break
    fi
    echo "   Waiting for frontend... ($i/30)"
    sleep 1
done

echo ""
echo "🎉 Michelin Star Hunter is now running!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "👤 Demo account:"
echo "   Email:    demo@example.com"
echo "   Password: password123"
echo ""
echo "📝 Logs are available in:"
echo "   Backend:  backend.log"
echo "   Frontend: frontend.log"
echo ""
echo "🛑 To stop the servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Save PIDs for easy cleanup
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo "✨ Happy Michelin star hunting!"