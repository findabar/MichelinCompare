#!/bin/bash

echo "🌟 Setting up Michelin Star Hunter..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "📝 On macOS: brew install postgresql"
    echo "📝 On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if database exists, create if not
if ! psql -lqt | cut -d \| -f 1 | grep -qw michelin_star_hunter; then
    echo "📂 Creating database..."
    createdb michelin_star_hunter
fi

# Set up backend
echo "🔧 Setting up backend..."
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Set up environment variables
if [ ! -f ".env" ]; then
    echo "⚙️ Creating environment file..."
    cp .env.example .env
    sed -i.bak 's/username:password@localhost/'"$USER"':@localhost/' .env
fi

# Run migrations and seed
echo "🗃️ Setting up database..."
npx prisma migrate dev --name init
npx prisma db seed

cd ..

# Set up frontend
echo "🎨 Setting up frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

cd ..

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "🌐 The app will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "👤 Demo account:"
echo "   Email:    demo@example.com"
echo "   Password: password123"