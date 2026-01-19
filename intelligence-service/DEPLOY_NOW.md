# Deploy Intelligence Service to Railway - Step by Step

## ✅ Code Already Pushed to GitHub!

The intelligence-service code has been committed and pushed to the `main` branch of your GitHub repository.

## 🚀 Deployment Steps

### Step 1: Create New Service in Railway Dashboard

1. Go to Railway dashboard: https://railway.app/project/c10d6b64-1df1-4dcc-958c-f9d038b591a7
2. Click **"New Service"**
3. Select **"GitHub Repo"**
4. Choose repository: **findabar/MichelinCompare**
5. Click **"Deploy"**

### Step 2: Configure Service Settings

Once the service is created:

1. Click on the new service
2. Go to **"Settings"**
3. Set the following:
   - **Service Name**: `intelligence-service`
   - **Root Directory**: `intelligence-service`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`

### Step 3: Set Environment Variables

Go to the **"Variables"** tab and add these variables:

#### Database (Copy from Backend)
```
DATABASE_URL=postgresql://postgres:AdRcLdLlXUZSaNdQJgGlfzWFWhAFeWfN@postgres.railway.internal:5432/railway
```

#### Railway Configuration (Already Known)
```
RAILWAY_PROJECT_ID=c10d6b64-1df1-4dcc-958c-f9d038b591a7
RAILWAY_ENVIRONMENT_ID=068ee883-3703-434a-8b04-962ebd5701e9
```

#### Railway API Token (You Need to Get This)
1. Go to: https://railway.app/account/tokens
2. Click **"Create Token"**
3. Name it: `Intelligence Service`
4. Copy the token
5. Add to Railway variables:
```
RAILWAY_API_TOKEN=<your_new_token_here>
```

#### Service IDs (You Need to Get These)

**To get Service IDs:**
1. In Railway dashboard, go to each service (backend, frontend, scraper)
2. Look at the URL when viewing the service
3. URL format: `https://railway.app/project/c10d6b64-1df1-4dcc-958c-f9d038b591a7/service/{SERVICE_ID}`
4. Copy the SERVICE_ID from each URL

Then add to variables:
```
BACKEND_SERVICE_ID=<get_from_backend_service_url>
FRONTEND_SERVICE_ID=<get_from_MichelinCompare_service_url>
SCRAPER_SERVICE_ID=<get_from_scraper_service_url>
```

#### GitHub Token (You Need to Create This)
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: `Intelligence Service Railway`
4. Select scopes:
   - ✅ `repo` (all sub-scopes)
   - ✅ `write:discussion`
5. Click **"Generate token"**
6. Copy the token
7. Add to Railway variables:
```
GITHUB_TOKEN=<your_github_token_here>
```

#### GitHub Repository Information
```
GITHUB_REPO_OWNER=findabar
GITHUB_REPO_NAME=MichelinCompare
```

#### Service Configuration
```
POLLING_INTERVAL_MINUTES=10
NODE_ENV=production
PORT=3003
```

### Complete Environment Variables Checklist

Copy and paste this template, filling in the values marked with `<...>`:

```bash
# Database
DATABASE_URL=postgresql://postgres:AdRcLdLlXUZSaNdQJgGlfzWFWhAFeWfN@postgres.railway.internal:5432/railway

# Railway API
RAILWAY_API_TOKEN=<create_at_railway.app/account/tokens>
RAILWAY_PROJECT_ID=c10d6b64-1df1-4dcc-958c-f9d038b591a7
RAILWAY_ENVIRONMENT_ID=068ee883-3703-434a-8b04-962ebd5701e9

# Service IDs (get from service URLs in Railway dashboard)
BACKEND_SERVICE_ID=<from_backend_service_url>
FRONTEND_SERVICE_ID=<from_MichelinCompare_service_url>
SCRAPER_SERVICE_ID=<from_scraper_service_url>

# GitHub
GITHUB_TOKEN=<create_at_github.com/settings/tokens>
GITHUB_REPO_OWNER=findabar
GITHUB_REPO_NAME=MichelinCompare

# Config
POLLING_INTERVAL_MINUTES=10
NODE_ENV=production
PORT=3003
```

### Step 4: Deploy

Once all environment variables are set:

1. Railway will automatically trigger a deployment
2. Watch the deployment logs
3. Wait for "✓ Build completed" and "✓ Deployment successful"

### Step 5: Verify Deployment

#### Get Service URL
1. In Railway dashboard, go to intelligence-service
2. Click "Settings" → "Networking"
3. Click "Generate Domain"
4. Note the URL (e.g., `intelligence-service-production.up.railway.app`)

#### Test Endpoints

```bash
# Health check
curl https://intelligence-service-production.up.railway.app/health

# Expected response:
# {"status":"healthy","service":"intelligence-service","timestamp":"...","isRunning":false}

# Check status
curl https://intelligence-service-production.up.railway.app/status

# Check stats
curl https://intelligence-service-production.up.railway.app/stats
```

### Step 6: Test Error Detection

#### Option A: Trigger Manual Check
```bash
curl -X POST https://intelligence-service-production.up.railway.app/trigger-check
```

Then check:
1. Railway logs for intelligence-service
2. GitHub issues for any new automated issues

#### Option B: Inject Test Error
1. Add a test error endpoint to your backend (temporarily)
2. Trigger the error
3. Wait 10 minutes (or use manual trigger)
4. Check GitHub for new issue with `needs-claude-analysis` label
5. Verify GitHub Action runs
6. Verify Claude comments on the issue
7. Verify label changes to `claude-analyzed`

## 📋 Quick Copy-Paste Guide

### Getting Service IDs from Railway Dashboard

1. **Backend Service**:
   - Navigate to: https://railway.app/project/c10d6b64-1df1-4dcc-958c-f9d038b591a7
   - Click on "backend" service
   - Copy SERVICE_ID from URL

2. **Frontend Service** (might be named "MichelinCompare"):
   - Click on "MichelinCompare" or "frontend" service
   - Copy SERVICE_ID from URL

3. **Scraper Service**:
   - Click on "scraper" service
   - Copy SERVICE_ID from URL

### Setting Variables in Railway Dashboard

For each variable:
1. Go to intelligence-service → Variables tab
2. Click "Add Variable"
3. Enter variable name (e.g., `RAILWAY_API_TOKEN`)
4. Enter variable value
5. Click "Add"
6. Repeat for all variables

OR use Railway CLI:
```bash
cd intelligence-service
railway link c10d6b64-1df1-4dcc-958c-f9d038b591a7
railway service intelligence-service

# Set each variable
railway variables set RAILWAY_API_TOKEN="your_token"
railway variables set BACKEND_SERVICE_ID="service_id"
# ... etc
```

## ⚠️ Important Notes

1. **Database URL**: Uses internal Railway Postgres address for better performance
2. **Railway API Token**: Needs read access to logs (create a dedicated token)
3. **GitHub Token**: Needs `repo` scope for issue creation
4. **Service IDs**: Must be exact IDs from Railway dashboard URLs
5. **Polling Interval**: Set to 10 minutes, can adjust based on needs

## 🔍 Troubleshooting

### Deployment Fails
- Check Railway build logs
- Verify all environment variables are set
- Ensure DATABASE_URL is correct

### Service Starts but No Errors Detected
- Verify Railway API token has correct permissions
- Check service IDs are correct (look in Railway logs for errors)
- Trigger manual check and watch logs

### GitHub Issues Not Created
- Verify GitHub token has repo scope
- Check GITHUB_REPO_OWNER and GITHUB_REPO_NAME are correct
- Look for GitHub API errors in Railway logs

### Claude Not Analyzing
- Ensure `.github/workflows/claude-issue-handler.yml` is in repo (it is!)
- Verify `CLAUDE_CODE_OAUTH_TOKEN` secret is set in GitHub repo settings
- Check GitHub Actions tab for workflow runs

## 📊 Monitoring

Once deployed:

1. **Railway Dashboard**: Monitor deployment health and logs
2. **GitHub Issues**: Watch for automated issues with `needs-claude-analysis` label
3. **Stats Endpoint**: Check `/stats` periodically for metrics
4. **Status Endpoint**: Check `/status` for unanalyzed issues

## 🎉 Success Criteria

- ✅ Service deployed and running on Railway
- ✅ Health endpoint responds
- ✅ No errors in Railway logs
- ✅ Manual trigger works
- ✅ Test error creates GitHub issue
- ✅ GitHub Action triggers on label
- ✅ Claude comments on issue
- ✅ Label updates to `claude-analyzed`

---

**Need Help?**
- Check [README.md](./README.md) for detailed documentation
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
