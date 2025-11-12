# Railway Monorepo Setup Guide

This project uses a monorepo structure with separate services. Each service needs to be configured in Railway to point to its specific directory.

## Project Structure

```
MichellinCompare/
├── backend/              # Backend API service
├── frontend/             # Frontend React app
├── scraper-service/      # Web scraper service
└── railway.toml         # Root config (not used for individual services)
```

## Railway Configuration

### 1. Backend Service

**In Railway Dashboard:**

1. Go to your Backend service
2. Click on **Settings**
3. Under **Source**, set:
   - **Root Directory**: `backend`
4. Under **Build**, the service will use `backend/railway.toml` automatically
5. Under **Variables**, add:
   - `JWT_SECRET` = (generate with: `openssl rand -base64 32`)
   - `FRONTEND_URL` = Your frontend URL (e.g., `https://your-frontend.railway.app`)
   - `DATABASE_URL` = Should be automatically set if Postgres is linked
   - `NODE_ENV` = `production` (auto-set)
   - `PORT` = Auto-set by Railway
   - `JWT_EXPIRES_IN` = `7d`

**Configuration from backend/railway.toml:**
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npx prisma db push && node dist/server.js`

---

### 2. Scraper Service

**In Railway Dashboard:**

1. Go to your Scraper service
2. Click on **Settings**
3. Under **Source**, set:
   - **Root Directory**: `scraper-service`
4. The service will use `scraper-service/railway.toml` automatically
5. Ensure environment variables are set as needed

**Configuration from scraper-service/railway.toml:**
- Build Command: `npm install && npx prisma generate`
- Start Command: `npm start`

---

### 3. Frontend Service (if deploying to Railway)

**In Railway Dashboard:**

1. Go to your Frontend service (or create a new one)
2. Click on **Settings**
3. Under **Source**, set:
   - **Root Directory**: `frontend`
4. Under **Build**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Under **Variables**, add:
   - `REACT_APP_API_URL` = Your backend URL (e.g., `https://your-backend.railway.app`)
   - `NODE_ENV` = `production`

---

## Important Notes

1. **Root railway.toml is NOT used** - Each service uses its own railway.toml in its subdirectory
2. **Database linking** - Make sure your Postgres database is linked to the Backend service
3. **CORS** - Ensure `FRONTEND_URL` in backend matches your actual frontend URL
4. **JWT_SECRET** - Must be set manually in Railway dashboard (not committed to git)

## Verification Steps

After configuration:

1. **Backend**: Visit `https://your-backend.railway.app/health` (should return OK)
2. **Scraper**: Check logs for successful startup
3. **Frontend**: Should be able to login/register successfully

## Troubleshooting

- **Login fails**: Check if `JWT_SECRET` is set in Backend service variables
- **Database errors**: Verify `DATABASE_URL` is set and Postgres is linked
- **CORS errors**: Ensure `FRONTEND_URL` matches your actual frontend domain
- **Build fails**: Check that Root Directory is set correctly for each service
