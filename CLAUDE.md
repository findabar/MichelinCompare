# Michelin Star Hunter - Claude Code Guide

## Project Overview

A full-stack application for tracking visits to Michelin-starred restaurants with gamification features. Users can log visits, earn points, and compete on a global leaderboard.

**Tech Stack:**
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Scraper: Node.js (JavaScript) with Puppeteer for web scraping

## Architecture

The codebase is organized into three main services:

```
/backend          # REST API server (TypeScript)
/frontend         # React SPA (TypeScript)
/scraper-service  # Michelin Guide web scraper (JavaScript)
```

### Backend (`/backend`)
- **Framework**: Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT-based authentication with bcrypt
- **Key directories**:
  - `src/routes/` - API endpoint handlers (auth, restaurants, visits, users, leaderboard)
  - `src/middleware/` - Auth middleware and validation
  - `src/services/` - Business logic (geocoding API)
  - `prisma/schema.prisma` - Database schema and models
  - `src/__tests__/` - Jest test files

### Frontend (`/frontend`)
- **Framework**: React with TypeScript and Vite
- **Styling**: Tailwind CSS
- **State**: React Query for server state
- **Key directories**:
  - `src/pages/` - Main page components (HomePage, RestaurantsPage, ProfilePage, etc.)
  - `src/components/` - Reusable UI components
  - `src/services/` - API client
  - `src/contexts/` - React context (AuthContext)
  - `src/hooks/` - Custom React hooks

### Scraper Service (`/scraper-service`)
- **Purpose**: Scrapes Michelin Guide website for restaurant data
- **Key files**:
  - `src/scraper.js` - Main scraper logic (42KB, handles Puppeteer automation)
  - `src/locationUpdater.js` - Geocoding and address extraction (40KB)
  - `src/server.js` - Express server for scraper API
  - `src/loader.js` - Database loading utilities
  - `prisma/schema.prisma` - Shared database schema

## Code Search Guide

### Finding API Endpoints
- **Authentication**: `backend/src/routes/auth.ts`
- **Restaurants**: `backend/src/routes/restaurants.ts`
- **Visits**: `backend/src/routes/visits.ts`
- **Users**: `backend/src/routes/users.ts`
- **Leaderboard**: `backend/src/routes/leaderboard.ts`
- **Geocoding**: `backend/src/routes/geocoding.ts`

### Database Models
- **Schema**: `backend/prisma/schema.prisma` (also `scraper-service/prisma/schema.prisma`)
- **Models**: User, Restaurant, UserVisit
- **Migrations**: `backend/prisma/migrations/`

### Frontend Pages
- **Home**: `frontend/src/pages/HomePage.tsx`
- **Restaurants**: `frontend/src/pages/RestaurantsPage.tsx`
- **Profile**: `frontend/src/pages/ProfilePage.tsx`
- **User Profile**: `frontend/src/pages/UserProfilePage.tsx`
- **Login/Register**: `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`
- **Leaderboard**: `frontend/src/pages/LeaderboardPage.tsx`

### Scraper Components
- **Main scraper**: `scraper-service/src/scraper.js`
- **Location/geocoding**: `scraper-service/src/locationUpdater.js`
- **Seeding**: `scraper-service/src/seeder.js`

## Finding Things by Symptom

### Authentication Issues
- Start at: `backend/src/middleware/auth.ts` or `backend/src/routes/auth.ts`
- Frontend auth: `frontend/src/contexts/AuthContext.tsx`
- JWT logic in backend middleware

### Restaurant Display/Filter Issues
- Frontend: `frontend/src/pages/RestaurantsPage.tsx`
- Backend API: `backend/src/routes/restaurants.ts`
- Database query logic in the routes file

### Visit Tracking Issues
- Frontend: `frontend/src/pages/ProfilePage.tsx` (displays visits)
- Backend API: `backend/src/routes/visits.ts`
- Database: UserVisit model in `prisma/schema.prisma`

### Scraper Not Working
- Main logic: `scraper-service/src/scraper.js`
- Address extraction: `scraper-service/src/locationUpdater.js`
- Test scripts: `scraper-service/src/test*.js` files

### Leaderboard/Scoring Issues
- Frontend: `frontend/src/pages/LeaderboardPage.tsx`
- Backend: `backend/src/routes/leaderboard.ts`
- Score calculation: Based on User.totalScore field, updated in visits.ts

### Database/Prisma Issues
- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Seed data: `backend/prisma/seed.ts`

### Geocoding/Location Issues
- API endpoint: `backend/src/routes/geocoding.ts`
- Service: `backend/src/services/geocodingService.ts`
- Scraper logic: `scraper-service/src/locationUpdater.js`

## Common Commands

### Development
```bash
# Start both frontend and backend in dev mode
npm run dev

# Individual services
cd backend && npm run dev        # Backend on :3001
cd frontend && npm run dev       # Frontend on :3000
cd scraper-service && npm start  # Scraper on :3002
```

### Database
```bash
cd backend

# Run migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate
```

### Testing
```bash
cd backend
npm test              # Run all tests
npm test -- --coverage  # With coverage report
```

### Build
```bash
# Build everything
npm run build

# Individual builds
cd backend && npm run build
cd frontend && npm run build
```

## File Reading Guidelines

### Large Files in Scraper Service
The scraper service has several large JavaScript files. When working with these:

- **scraper.js** (42KB, ~1000 lines): Read in sections, use grep to find specific functions
- **locationUpdater.js** (40KB, ~900 lines): Contains geocoding and address extraction logic
- **testLocationUpdater.js** (29KB): Test file, check specific test cases

**Tip**: Use `grep -n "function\|const.*=" <file>` to get an outline of functions before reading the full file.

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

### Scraper Service (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/michelin_star_hunter?schema=public"
PORT=3002
```

## Database Schema Overview

### User
- Authentication: email, passwordHash
- Profile: username, totalScore, restaurantsVisitedCount
- Relations: visits (UserVisit[])

### Restaurant
- Basic info: name, city, country, cuisineType
- Michelin data: michelinStars (1-3), yearAwarded
- Location: address, latitude, longitude
- Rich data: description, priceRange, url
- Relations: visits (UserVisit[])

### UserVisit
- Links User ↔ Restaurant
- Fields: dateVisited, notes
- Unique constraint: one visit per user per restaurant

## Key Design Patterns

### API Response Format
All API responses follow this structure:
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Error message" }
```

### Authentication Flow
1. User logs in → backend generates JWT
2. Frontend stores JWT in localStorage
3. AuthContext provides auth state
4. Protected routes check auth status
5. API calls include JWT in Authorization header

### Points System
- 1 star restaurant = 1 point
- 2 star restaurant = 2 points
- 3 star restaurant = 3 points
- User.totalScore updated when UserVisit is created/deleted

## Troubleshooting

### Database Connection Errors
```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Verify DATABASE_URL in .env files
# Make sure database exists: createdb michelin_star_hunter
```

### Prisma Client Errors
```bash
cd backend
npx prisma generate  # Regenerate Prisma Client
npx prisma db push   # Sync schema to database
```

### Port Already in Use
```bash
# Find and kill process on port
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:3002 | xargs kill -9  # Scraper
```

### Scraper Issues
- **Timeouts**: Increase timeout in scraper.js
- **Selectors not working**: Michelin Guide website may have changed structure
- **Rate limiting**: Add delays between requests in scraper.js
- **Missing locations**: Check locationUpdater.js geocoding logic

## Recent Context

**Git Status**: Clean working tree on `main` branch

**Recent Commits**:
- Extract actual street addresses from Michelin restaurant detail pages
- Fix Prisma query syntax for address filtering in geocoding API
- Add geocoding test script and improve address filtering
- Fix accessibility issues in RestaurantsPage

## Notes for Claude Code

- **Code style**: Project uses TypeScript for backend/frontend, JavaScript for scraper
- **Prefer existing patterns**: Follow existing API response format and error handling
- **Security**: Don't bypass JWT auth, validate inputs, use Prisma to prevent SQL injection
- **Testing**: Backend has Jest tests, add tests for new backend features
- **Database changes**: Always create Prisma migrations, don't modify database directly
- **Scraper is fragile**: Web scraping depends on Michelin Guide's HTML structure
