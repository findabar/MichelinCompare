# 🚀 Quick Start Guide

Get the Michelin Star Hunter app running in 5 minutes!

## 🎯 Fastest Setup (Local Development)

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/download/)

### Step 1: Clone and Setup
```bash
git clone <repository-url>
cd MichellinCompare
```

### Step 2: Database Setup

**macOS (with Homebrew):**
```bash
brew services start postgresql
createdb michelin_star_hunter
```

**Ubuntu/Debian:**
```bash
sudo systemctl start postgresql
sudo -u postgres createdb michelin_star_hunter
```

**Windows:**
```bash
# Start PostgreSQL service, then:
createdb michelin_star_hunter
```

### Step 3: Backend Setup
```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Setup database
npx prisma migrate dev --name init
npx prisma db seed

# Start backend (in background)
npm run dev &
```

### Step 4: Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

### Step 5: Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Demo Account**: demo@example.com / password123

---

## 🐳 Docker Alternative (If Local Setup Fails)

If you have Docker issues, use this simple approach:

### Clean Docker Setup
```bash
# Clean any previous Docker attempts
docker-compose down -v
docker system prune -f

# Start fresh
docker-compose up --build
```

### Manual Database Setup (if auto-setup fails)
```bash
# Wait for containers to start, then:
docker exec michelin-backend npx prisma migrate deploy
docker exec michelin-backend npx prisma db seed
```

---

## 🔧 Common Issues & Fixes

### "Database connection refused"
```bash
# Make sure PostgreSQL is running
brew services restart postgresql  # macOS
sudo systemctl restart postgresql # Ubuntu
```

### "Port already in use"
```bash
# Kill processes on ports 3000/3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### "Prisma client not found"
```bash
cd backend
npx prisma generate
```

### "npm ci requires package-lock.json"
```bash
# Use npm install instead
rm package-lock.json
npm install
```

---

## ✨ What You'll See

After setup, you'll have:
- 🏠 **Home Page**: App overview and stats
- 🍽️ **Restaurant Browser**: 20+ Michelin-starred restaurants
- 📊 **Dashboard**: Personal visit tracking
- 🏆 **Leaderboard**: Global user rankings
- 👤 **User Profiles**: Achievement system

---

## 🎮 Demo Account

- **Email**: demo@example.com
- **Password**: password123

Or create your own account to start hunting Michelin stars!

---

**Need help?** Check the main README.md for detailed troubleshooting.