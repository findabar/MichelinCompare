# 🚀 Render Deployment Guide for Michelin Star Hunter

## Prerequisites
- GitHub account
- Render account (free at render.com)

## Step 1: Push to GitHub

### 1.1 Create GitHub Repository
1. Go to GitHub and create a new repository named `michelin-star-hunter`
2. Don't initialize with README (we already have one)

### 1.2 Push Your Code
```bash
# Add all files to git
git add .

# Create initial commit
git commit -m "Initial commit: Michelin Star Hunter app"

# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/michelin-star-hunter.git

# Push to GitHub
git push -u origin main
```

## Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `michelin-star-hunter-db`
   - **Database**: `michelin_star_hunter`
   - **User**: `michelin_user`
   - **Region**: Oregon (US West) or Frankfurt (Europe)
   - **Plan**: Free (for testing) or Starter ($7/month)
4. Click **"Create Database"**
5. **Save the database URL** - you'll need it for the backend

## Step 3: Deploy Backend API

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `michelin-star-hunter-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Build Command**: `./render-build.sh`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing) or Starter ($7/month)

### 3.1 Environment Variables
Add these environment variables in the backend service:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `your-super-secret-jwt-key-at-least-32-characters-long` |
| `JWT_EXPIRES_IN` | `7d` |
| `DATABASE_URL` | *Copy from your PostgreSQL database* |
| `FRONTEND_URL` | `https://michelin-star-hunter-frontend.onrender.com` |

**Important**:
- Generate a strong JWT_SECRET (32+ characters)
- Copy the DATABASE_URL from your PostgreSQL database dashboard

4. Click **"Create Web Service"**

## Step 4: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `michelin-star-hunter-frontend`
   - **Root Directory**: `frontend`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 4.1 Environment Variables
Add this environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://michelin-star-hunter-backend.onrender.com/api` |

**Note**: Replace `michelin-star-hunter-backend` with your actual backend service name

4. Click **"Create Static Site"**

## Step 5: Update Backend CORS Settings

After frontend is deployed, update the backend's `FRONTEND_URL` environment variable:

1. Go to your backend service settings
2. Update `FRONTEND_URL` to match your frontend URL
3. Save and redeploy

## Step 6: Test Your Deployment

### 6.1 Check Services
- ✅ Database should show "Available"
- ✅ Backend should show "Live" with API endpoints working
- ✅ Frontend should show "Live" and load the app

### 6.2 Test the App
1. Visit your frontend URL
2. Try creating an account
3. Log in with demo account: `demo@example.com` / `password123`
4. Browse restaurants and test functionality

## Your Live URLs

After deployment, you'll have:
- **Frontend**: `https://michelin-star-hunter-frontend.onrender.com`
- **Backend API**: `https://michelin-star-hunter-backend.onrender.com/api`
- **Database**: Managed by Render

## Troubleshooting

### Backend Issues
```bash
# Check logs in Render dashboard
# Common issues:
# - DATABASE_URL not set correctly
# - JWT_SECRET too short
# - Build script permissions
```

### Frontend Issues
```bash
# Check if VITE_API_URL points to correct backend
# Check browser network tab for API calls
```

### Database Issues
```bash
# Ensure database is "Available"
# Check DATABASE_URL format
# Verify database and backend are in same region
```

## Cost Summary

### Free Tier (Good for testing)
- Database: Free (90 days, then $7/month)
- Backend: Free (750 hours/month, sleeps after 15min inactivity)
- Frontend: Free (100GB bandwidth/month)

### Starter Plan (Recommended for production)
- Database: $7/month
- Backend: $7/month (always on)
- Frontend: Free
- **Total**: $14/month

## Custom Domain (Optional)

1. Purchase domain from any provider
2. In Render dashboard, go to your frontend service
3. Add custom domain in settings
4. Update DNS records as instructed
5. SSL certificate is automatic

## Security Checklist

- ✅ Strong JWT_SECRET (32+ characters)
- ✅ Environment variables set correctly
- ✅ CORS configured properly
- ✅ HTTPS enabled (automatic)
- ✅ Database connection secured

## Next Steps

1. Set up monitoring and alerts
2. Configure backup schedule for database
3. Add your custom domain
4. Share your live app with the world! 🌟

---

**Your Michelin Star Hunter app will be live at:**
`https://michelin-star-hunter-frontend.onrender.com`

Happy hunting! 🍽️