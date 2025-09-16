# 🚀 Deployment Guide

## Railway Deployment (Recommended)

### Step 1: Prepare for Deployment
```bash
# Make sure everything builds locally
npm run build

# Test Docker locally
docker-compose up --build
```

### Step 2: Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy
railway up
```

### Step 3: Configure Environment Variables
In Railway dashboard, add:
```env
DATABASE_URL=<Railway will auto-provide this>
JWT_SECRET=your-super-secret-production-key-min-32-chars
NODE_ENV=production
FRONTEND_URL=https://your-app.railway.app
```

### Step 4: Add Custom Domain (Optional)
- Go to Railway dashboard
- Add custom domain in settings
- Point your domain's DNS to Railway

## Render Deployment

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/michelin-star-hunter.git
git push -u origin main
```

### Step 2: Create Render Services
1. **Database**: Create PostgreSQL database
2. **Backend**: Create Web Service
   - Repository: your GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. **Frontend**: Create Static Site
   - Repository: your GitHub repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

### Step 3: Configure Environment Variables
Backend environment variables:
```env
DATABASE_URL=<Render database URL>
JWT_SECRET=your-super-secret-production-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend.onrender.com
```

Frontend environment variables:
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## Production Considerations

### Security
- [ ] Change JWT_SECRET to a strong random key
- [ ] Use environment-specific database URLs
- [ ] Enable HTTPS (auto with most platforms)
- [ ] Set up proper CORS origins

### Performance
- [ ] Enable database connection pooling
- [ ] Set up CDN for static assets
- [ ] Configure proper caching headers
- [ ] Monitor database query performance

### Monitoring
- [ ] Set up error logging (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up database backups
- [ ] Monitor application performance

## Cost Estimates

### Railway (Recommended for MVP)
- **Free Tier**: $0/month (limited usage)
- **Pro**: $20/month (includes database)
- **Scale**: $20+ based on usage

### Render
- **Free**: $0/month (limited, sleeps after inactivity)
- **Starter**: $7/month per service
- **Pro**: $25/month per service

### DigitalOcean
- **App Platform**: $12/month
- **Database**: $15/month
- **Total**: ~$27/month

## Quick Start Commands

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Render
1. Push code to GitHub
2. Connect repository in Render dashboard
3. Configure environment variables
4. Deploy

Choose Railway for the fastest deployment with minimal configuration!