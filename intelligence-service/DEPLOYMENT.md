# Deployment Guide - Intelligence Service

Step-by-step guide to deploy the Intelligence Service to Railway.

## Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Railway account with existing project
- GitHub Personal Access Token with `repo` and `issues:write` scopes
- Railway API token

## Step 1: Get Railway Service IDs

First, you need to get the service IDs for your existing services.

### Option A: Via Railway Dashboard
1. Go to your Railway project
2. Click on each service (backend, frontend, scraper)
3. Look in the URL: `https://railway.app/project/{PROJECT_ID}/service/{SERVICE_ID}`
4. Copy the SERVICE_ID for each

### Option B: Via Railway CLI
```bash
railway login
railway link  # Link to your existing project
railway status
```

## Step 2: Get Railway API Token

1. Go to https://railway.app/account/tokens
2. Click "Create Token"
3. Give it a name: "Intelligence Service"
4. Copy the token

## Step 3: Get Railway Environment ID

```bash
# Link to your project
railway link

# List environments
railway environment

# Note the environment ID (usually shown in CLI output)
```

Or from the dashboard:
- Go to your project
- Click on environment (e.g., "production")
- Check the URL: `https://railway.app/project/{PROJECT_ID}/environment/{ENVIRONMENT_ID}`

## Step 4: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (all)
   - ✅ `write:discussion`
4. Generate and copy the token

## Step 5: Create Intelligence Service on Railway

### Option A: Via Railway Dashboard
1. Go to your Railway project
2. Click "New Service"
3. Select "Empty Service"
4. Name it "intelligence-service"

### Option B: Via Railway CLI
```bash
cd intelligence-service
railway init
railway service create intelligence-service
railway link
```

## Step 6: Set Environment Variables

Copy all required variables to Railway:

```bash
# Database (use existing database URL from your backend)
railway variables set DATABASE_URL="postgresql://..."

# Railway API
railway variables set RAILWAY_API_TOKEN="your_railway_api_token"
railway variables set RAILWAY_PROJECT_ID="c10d6b64-1df1-4dcc-958c-f9d038b591a7"
railway variables set RAILWAY_ENVIRONMENT_ID="your_environment_id"

# Service IDs (get from Step 1)
railway variables set BACKEND_SERVICE_ID="your_backend_service_id"
railway variables set FRONTEND_SERVICE_ID="your_frontend_service_id"
railway variables set SCRAPER_SERVICE_ID="your_scraper_service_id"

# GitHub
railway variables set GITHUB_TOKEN="your_github_pat"
railway variables set GITHUB_REPO_OWNER="findabar"
railway variables set GITHUB_REPO_NAME="MichelinCompare"

# Config
railway variables set POLLING_INTERVAL_MINUTES="10"
railway variables set NODE_ENV="production"
railway variables set PORT="3003"
```

Or set them in the Railway dashboard:
1. Go to intelligence-service
2. Click "Variables"
3. Add each variable

## Step 7: Deploy

### Via Railway CLI
```bash
cd intelligence-service
railway up
```

### Via GitHub (Recommended)
1. Push code to GitHub
2. In Railway dashboard, go to intelligence-service
3. Click "Settings" → "Service"
4. Connect to GitHub repository
5. Set root directory to `intelligence-service`
6. Railway will auto-deploy on push

## Step 8: Run Migrations

After first deployment, run migrations:

```bash
railway run npx prisma migrate deploy
```

Or via Railway dashboard:
1. Go to deployments
2. Click on running deployment
3. Open terminal
4. Run: `npx prisma migrate deploy`

## Step 9: Verify Deployment

### Check Health
```bash
curl https://intelligence-service-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "intelligence-service",
  "timestamp": "2026-01-19T...",
  "isRunning": false
}
```

### Check Status
```bash
curl https://intelligence-service-production.up.railway.app/status
```

### Trigger Manual Check (Testing)
```bash
curl -X POST https://intelligence-service-production.up.railway.app/trigger-check
```

## Step 10: Test End-to-End

### 1. Inject Test Error
Add to your backend (temporarily):
```typescript
// In backend/src/routes/restaurants.ts
app.get('/api/test-error', (req, res) => {
  throw new Error('TEST ERROR: Intelligence service test - database connection failed');
});
```

### 2. Trigger the Error
```bash
curl https://your-backend.railway.app/api/test-error
```

### 3. Wait or Trigger Check
Wait 10 minutes or trigger manually:
```bash
curl -X POST https://intelligence-service-production.up.railway.app/trigger-check
```

### 4. Check GitHub Issues
1. Go to your GitHub repository
2. Check "Issues" tab
3. Look for new issue with `needs-claude-analysis` label

### 5. Verify GitHub Action
1. Go to "Actions" tab
2. Check that workflow ran
3. Verify Claude commented on the issue

### 6. Check Labels
Issue should now have `claude-analyzed` label

## Step 11: Monitor

### View Logs
```bash
railway logs
```

Or in Railway dashboard:
1. Go to intelligence-service
2. Click "Deployments"
3. Click on running deployment
4. View logs

### Check Statistics
```bash
curl https://intelligence-service-production.up.railway.app/stats
```

## Troubleshooting

### Service Won't Start
- Check Railway logs for errors
- Verify DATABASE_URL is correct
- Ensure all required env vars are set
- Check Prisma migrations ran successfully

### No Errors Detected
- Verify Railway API token is valid
- Check service IDs are correct
- Ensure errors are actually in the logs
- Check polling interval setting
- Trigger manual check to debug

### GitHub Issues Not Created
- Verify GitHub token has correct permissions
- Check repository owner/name are correct
- Look for API errors in Railway logs
- Test GitHub token with `gh auth status`

### Claude Not Analyzing
- Check `.github/workflows/claude-issue-handler.yml` exists
- Verify `CLAUDE_CODE_OAUTH_TOKEN` is set in GitHub secrets
- Ensure issue has `needs-claude-analysis` label
- Check GitHub Actions logs

### Database Connection Errors
- Ensure DATABASE_URL matches your main database
- Verify migrations ran successfully
- Check network connectivity from Railway

## Monitoring in Production

### Set Up Alerts (Optional)
1. In Railway dashboard, go to intelligence-service
2. Click "Settings" → "Alerts"
3. Add email or webhook for deployment failures

### Regular Checks
- Monitor GitHub issues for recurring errors
- Check `/stats` endpoint weekly
- Review Railway service health

## Updating the Service

### Update Code
```bash
git pull
railway up
```

Or push to GitHub (if connected)

### Update Environment Variables
```bash
railway variables set VARIABLE_NAME="new_value"
```

### Database Schema Changes
```bash
# Create new migration locally
npx prisma migrate dev --name migration_name

# Push to GitHub
git add prisma/migrations
git commit -m "Add new migration"
git push

# Railway will auto-deploy and run migrations
```

## Rollback

If something goes wrong:

```bash
# View deployments
railway deployments

# Rollback to previous deployment
railway rollback
```

Or in Railway dashboard:
1. Go to "Deployments"
2. Click on previous successful deployment
3. Click "Redeploy"

## Cost Optimization

The service is designed to be lightweight:
- Uses minimal memory (~128MB)
- Polls every 10 minutes (configurable)
- Reuses existing database
- No external API calls except Railway + GitHub

Expected cost: **~$5/month** on Railway Hobby plan

To reduce costs:
- Increase polling interval: `POLLING_INTERVAL_MINUTES=15` or `30`
- Use Railway's sleep mode for non-critical periods
- Share database with main backend

## Security Best Practices

1. **Rotate tokens regularly**
   - Railway API token every 90 days
   - GitHub PAT every 90 days

2. **Use Railway secrets**
   - Never commit tokens to git
   - Store all sensitive values in Railway variables

3. **Limit GitHub token scope**
   - Only grant `repo` and `issues:write`
   - Use fine-grained tokens if possible

4. **Monitor API usage**
   - Check Railway API rate limits
   - Monitor GitHub API usage

## Support

If you encounter issues:
1. Check Railway logs first
2. Review GitHub Actions logs
3. Test API endpoints manually
4. Check this guide and README.md
5. Open an issue in the repository
