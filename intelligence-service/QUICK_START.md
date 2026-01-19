# Quick Start Guide - Intelligence Service

## 5-Minute Setup

### 1. Prerequisites
```bash
# Ensure you have:
- Railway account with existing project
- GitHub repository access
- PostgreSQL database (shared with main app)
```

### 2. Get Required IDs

**Railway Service IDs** (from Railway dashboard URLs):
```
Backend:  https://railway.app/project/YOUR_PROJECT_ID/service/BACKEND_ID
Frontend: https://railway.app/project/YOUR_PROJECT_ID/service/FRONTEND_ID
Scraper:  https://railway.app/project/YOUR_PROJECT_ID/service/SCRAPER_ID
```

**Railway API Token**: https://railway.app/account/tokens

**GitHub Token**: https://github.com/settings/tokens (needs `repo` scope)

### 3. Setup Locally
```bash
cd intelligence-service

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Run setup script
./scripts/setup.sh

# Or manually:
npm install
npx prisma generate
npx prisma migrate deploy
```

### 4. Test Locally
```bash
# Start service
npm run dev

# In another terminal, test
./scripts/test-error-detection.sh http://localhost:3003
```

### 5. Deploy to Railway
```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set all environment variables (see .env)
railway variables set RAILWAY_API_TOKEN="..."
railway variables set GITHUB_TOKEN="..."
# ... set all others

# Deploy
railway up

# Run migrations
railway run npx prisma migrate deploy
```

### 6. Verify
```bash
# Get your Railway URL
railway domain

# Test health
curl https://your-service.railway.app/health

# Trigger manual check
curl -X POST https://your-service.railway.app/trigger-check
```

## Quick Test

### Test Error Detection
```bash
# 1. Add test error to your backend
# In backend/src/routes/restaurants.ts:
app.get('/api/test-intelligence', (req, res) => {
  throw new Error('TEST: Intelligence service detection test');
});

# 2. Deploy backend change
cd backend && railway up

# 3. Trigger error
curl https://your-backend.railway.app/api/test-intelligence

# 4. Wait 10 min or trigger manually
curl -X POST https://your-intelligence-service.railway.app/trigger-check

# 5. Check GitHub issues
# Should see new issue with "needs-claude-analysis" label

# 6. Wait for Claude to analyze
# Check issue for Claude's comment

# 7. Verify label changed to "claude-analyzed"
```

## Environment Variables Checklist

```bash
✅ DATABASE_URL              # PostgreSQL connection
✅ RAILWAY_API_TOKEN         # From Railway account settings
✅ RAILWAY_PROJECT_ID        # From Railway dashboard URL
✅ RAILWAY_ENVIRONMENT_ID    # From Railway dashboard URL
✅ BACKEND_SERVICE_ID        # From backend service URL
✅ FRONTEND_SERVICE_ID       # From frontend service URL
✅ SCRAPER_SERVICE_ID        # From scraper service URL
✅ GITHUB_TOKEN              # GitHub PAT with repo scope
✅ GITHUB_REPO_OWNER         # "findabar"
✅ GITHUB_REPO_NAME          # "MichelinCompare"
✅ POLLING_INTERVAL_MINUTES  # "10" (recommended)
```

## Common Commands

```bash
# Development
npm run dev                  # Start in dev mode
npm run build                # Build TypeScript
npm start                    # Start production

# Database
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Create migration
npx prisma migrate deploy    # Run migrations
npx prisma studio            # Open DB GUI

# Testing
./scripts/test-error-detection.sh
curl http://localhost:3003/health
curl http://localhost:3003/status
curl http://localhost:3003/stats
curl -X POST http://localhost:3003/trigger-check

# Railway
railway login                # Login to Railway
railway link                 # Link to project
railway up                   # Deploy
railway logs                 # View logs
railway run [command]        # Run command
railway variables set X=Y    # Set variable
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Current status & unanalyzed issues |
| `/stats` | GET | Statistics & metrics |
| `/trigger-check` | POST | Manual trigger (testing) |

## Troubleshooting

**Service won't start:**
```bash
# Check logs
railway logs

# Verify env vars
railway variables

# Check database
npx prisma db execute --stdin <<< "SELECT 1;"
```

**No errors detected:**
```bash
# Check service IDs are correct
railway variables | grep SERVICE_ID

# Verify Railway API token
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://backboard.railway.app/graphql/v2

# Trigger manually and check logs
curl -X POST https://your-service.railway.app/trigger-check
railway logs
```

**GitHub issues not created:**
```bash
# Test GitHub token
gh auth status

# Check permissions
gh api user

# Verify repo access
gh repo view findabar/MichelinCompare
```

## File Structure
```
intelligence-service/
├── src/
│   ├── server.ts              # Express + cron
│   ├── cron.ts                # Main logic
│   ├── services/
│   │   ├── railwayLogPoller.ts
│   │   ├── errorDetector.ts
│   │   ├── githubIssueCreator.ts
│   │   └── stateManager.ts
│   ├── types/
│   │   ├── logs.ts
│   │   └── errors.ts
│   └── utils/
│       ├── errorPatterns.ts
│       └── logParser.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── setup.sh
│   └── test-error-detection.sh
├── package.json
├── tsconfig.json
├── railway.toml
└── .env
```

## Next Steps

1. ✅ Setup environment variables
2. ✅ Deploy to Railway
3. ✅ Test error detection
4. ✅ Verify GitHub integration
5. ✅ Monitor for 24 hours
6. 📊 Review statistics
7. 🎯 Adjust polling interval if needed

## Support

- **Documentation**: See README.md, DEPLOYMENT.md, ARCHITECTURE.md
- **Issues**: https://github.com/findabar/MichelinCompare/issues
- **Logs**: `railway logs` or Railway dashboard

## Cost

- Railway: ~$5/month (128MB, minimal network)
- Claude API: $0/month (uses existing subscription)
- Total: **~$5/month** 🎉
