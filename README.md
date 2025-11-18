# Michelin Star Hunter 🌟

[![codecov](https://codecov.io/gh/findabar/MichellinCompare/branch/main/graph/badge.svg)](https://codecov.io/gh/findabar/MichellinCompare)

A gamified platform where users can track visits to Michelin-starred restaurants and compete for the highest score.

## Features

### 🍽️ Restaurant Database
- Comprehensive database of Michelin-starred restaurants worldwide
- Filter by star rating (1, 2, 3 stars), country, city, and cuisine type
- Detailed restaurant information including location, cuisine, and year awarded

### 👤 User System
- Secure user registration and authentication with JWT
- Personal dashboard with visit tracking and statistics
- User profiles with achievements and visit history

### 🏆 Gamification
- Points system: 1 star = 1 point, 2 stars = 2 points, 3 stars = 3 points
- Global leaderboard ranking users by total points
- Achievement system for milestones
- Social features to view other users' profiles

### 📊 Analytics
- Personal statistics: visits by star rating, countries explored
- Global stats showing community activity
- Progress tracking and achievements

## Tech Stack

### Backend
- **Node.js** with **Express** and **TypeScript**
- **PostgreSQL** with **Prisma** ORM
- **JWT** authentication with **bcrypt** password hashing
- **Joi** validation and **express-rate-limit** for security

### Frontend
- **React** with **TypeScript** and **Vite**
- **Tailwind CSS** for styling
- **React Query** for state management and caching
- **React Router** for navigation
- **React Hook Form** for form handling

### Deployment
- **Docker** and **Docker Compose** for containerization
- **Nginx** for frontend serving and reverse proxy
- Production-ready configuration

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Docker (optional)

### Option 1: Automated Setup Script (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MichellinCompare
   ```

2. **Run the setup script**
   ```bash
   ./setup.sh
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Option 2: Docker Compose

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MichellinCompare
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

   The database will be automatically migrated and seeded on first startup.

### Option 3: Manual Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd MichellinCompare
   npm install
   ```

2. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb michelin_star_hunter
   ```

3. **Configure environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   ```

4. **Set up database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development servers**
   ```bash
   # Root directory
   npm run dev
   # This starts both frontend (port 3000) and backend (port 3001)
   ```

## Database Schema

### Users
- `id`, `username`, `email`, `passwordHash`
- `totalScore`, `restaurantsVisitedCount`
- Timestamps

### Restaurants
- `id`, `name`, `city`, `country`, `cuisineType`
- `michelinStars` (1-3), `yearAwarded`
- `address`, `latitude`, `longitude`, `description`
- Timestamps

### UserVisits
- `id`, `userId`, `restaurantId`
- `dateVisited`, `notes`
- Timestamps
- Unique constraint on `userId + restaurantId`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Restaurants
- `GET /api/restaurants` - List restaurants with filtering
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/filters` - Get available filter options

### Visits
- `POST /api/visits` - Record a restaurant visit
- `GET /api/visits` - Get user's visits
- `DELETE /api/visits/:id` - Remove a visit

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/profile/:username` - Get public user profile

### Leaderboard
- `GET /api/leaderboard` - Get top users
- `GET /api/leaderboard/stats` - Get global statistics

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/michelin_star_hunter?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001/api"
```

## Production Deployment

### Using Docker

1. **Configure production environment**
   ```bash
   # Update docker-compose.yml with production values
   # Set strong JWT_SECRET and database credentials
   ```

2. **Deploy**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Run migrations**
   ```bash
   docker exec michelin-backend npx prisma migrate deploy
   docker exec michelin-backend npx prisma db seed
   ```

### Manual Deployment

1. **Build applications**
   ```bash
   npm run build
   ```

2. **Set up PostgreSQL**
   - Create production database
   - Run migrations: `npx prisma migrate deploy`
   - Seed data: `npx prisma db seed`

3. **Configure reverse proxy**
   - Set up Nginx or similar to serve frontend and proxy API requests

4. **Start backend**
   ```bash
   cd backend
   npm start
   ```

## Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation with Joi
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Security headers with Helmet
- ✅ SQL injection protection with Prisma
- ✅ XSS protection

## Testing

### Demo Account
- **Email**: demo@example.com
- **Password**: password123

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Docker Issues

**Problem**: Docker Compose fails with npm errors
**Solution**:
```bash
# Clean up and rebuild
docker-compose down -v
docker system prune -f
docker-compose up --build --force-recreate
```

**Problem**: Database connection errors
**Solution**:
```bash
# Check if PostgreSQL container is running
docker ps
# Wait for PostgreSQL to be fully ready (takes ~30 seconds)
docker logs michelin-postgres
```

### Local Development Issues

**Problem**: Database connection refused
**Solution**:
```bash
# Make sure PostgreSQL is running
brew services start postgresql
# Or on Ubuntu: sudo systemctl start postgresql
```

**Problem**: Port already in use
**Solution**:
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Problem**: Prisma client errors
**Solution**:
```bash
cd backend
npx prisma generate
npx prisma db push
```

### Environment Variables

Make sure your `.env` file in the backend directory has the correct database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/michelin_star_hunter?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Check existing GitHub issues
3. Create a new issue with detailed description
4. Include environment information and steps to reproduce

---

Built with ❤️ for food enthusiasts and Michelin star hunters worldwide!