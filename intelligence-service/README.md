# Intelligence Service

Automated Railway log monitoring and error detection service that creates GitHub issues for Claude Code to analyze.

## Overview

This service polls Railway deployment logs every 10 minutes, detects errors, and automatically creates GitHub issues with the `needs-claude-analysis` label. When an issue is created, the GitHub Action workflow triggers Claude Code to analyze the error and provide fix suggestions.

## Architecture

```
Railway Logs → Intelligence Service (error detection)
  → Creates GitHub issue with "needs-claude-analysis" label
  → GitHub Action triggers Claude Code
  → Claude analyzes logs + codebase
  → Claude comments with fix suggestions
  → Intelligence Service marks as "analyzed"
```

## Features

- **Automatic Error Detection**: Polls Railway logs and detects error patterns
- **Smart Grouping**: Groups related errors and prevents duplicate issues
- **Pattern Matching**: Recognizes common error types (database, auth, network, etc.)
- **GitHub Integration**: Creates detailed issues with error context
- **Claude Analysis**: Leverages Claude Code for intelligent fix suggestions
- **Recurrence Tracking**: Updates existing issues when errors recur
- **State Management**: Tracks checkpoints and analyzed issues in database

## Setup

### 1. Install Dependencies

```bash
cd intelligence-service
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string (shared with main app)
- `RAILWAY_API_TOKEN`: Railway API token for fetching logs
- `RAILWAY_PROJECT_ID`: Your Railway project ID
- `RAILWAY_ENVIRONMENT_ID`: Railway environment ID (usually production)
- `BACKEND_SERVICE_ID`: Railway service ID for backend
- `FRONTEND_SERVICE_ID`: Railway service ID for frontend
- `SCRAPER_SERVICE_ID`: Railway service ID for scraper
- `GITHUB_TOKEN`: GitHub PAT with `repo` and `issues:write` permissions
- `GITHUB_REPO_OWNER`: GitHub repository owner
- `GITHUB_REPO_NAME`: GitHub repository name

### 3. Run Database Migrations

```bash
npm run prisma:generate
npx prisma migrate dev --name init
```

### 4. Run Locally

```bash
npm run dev
```

## Deployment to Railway

### 1. Create New Service

```bash
railway service create intelligence-service
railway link
```

### 2. Set Environment Variables

Set all required environment variables in the Railway dashboard or via CLI:

```bash
railway variables set RAILWAY_API_TOKEN=your_token
railway variables set GITHUB_TOKEN=your_token
# ... set all other variables
```

### 3. Deploy

```bash
railway up
```

The service will automatically:
- Run Prisma migrations on startup
- Start the Express server
- Begin polling logs every 10 minutes

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Trigger Manual Check
```
POST /trigger-check
```
Manually triggers a log check (useful for testing).

### Get Statistics
```
GET /stats
```
Returns statistics about detected issues.

### Get Status
```
GET /status
```
Returns current status and unanalyzed issues.

## Error Detection

The service detects these error patterns:

- **Database**: Connection refused, migration failures, deadlocks
- **Auth**: JWT expired, invalid tokens, authentication failures
- **Network**: CORS errors, timeouts, connection resets
- **Scraper**: Puppeteer timeouts, browser launch failures
- **Memory**: Heap out of memory errors
- **API**: Rate limits, quota exceeded
- **General**: Uncaught exceptions, unhandled rejections

Each error is assigned a severity level:
- 🚨 **Critical**: Requires immediate attention
- ⚠️ **High**: Important but not blocking
- ⚡ **Medium**: Should be addressed soon
- 📌 **Low**: Minor issues

## Database Schema

### LogCheckpoint
Tracks the last time logs were checked for each service.

### DetectedIssue
Stores information about detected errors and their GitHub issues.

## GitHub Issue Format

Issues created by this service include:
- Service name and error category
- Severity level
- Error message and stack trace
- First/last seen timestamps
- Occurrence count
- Links to Railway logs and service
- Request for Claude to analyze

## Testing

### Test Error Detection
Inject a test error in your backend:

```typescript
// Temporarily add to a route:
throw new Error('TEST ERROR: Database connection test');
```

### Trigger Manual Check
```bash
curl -X POST https://your-intelligence-service.railway.app/trigger-check
```

### Verify
1. Check that GitHub issue was created
2. Verify `needs-claude-analysis` label is present
3. Wait for GitHub Action to trigger
4. Verify Claude commented on the issue
5. Verify label changed to `claude-analyzed`

## Monitoring

Check service status:
```bash
curl https://your-intelligence-service.railway.app/status
```

View statistics:
```bash
curl https://your-intelligence-service.railway.app/stats
```

## Cost

- Railway hosting: ~$5/month (128MB memory, minimal network)
- Claude API: $0/month (uses existing Claude Code subscription)
- GitHub API: Free (within rate limits)

**Total: ~$5/month**

## Troubleshooting

### Service not detecting errors
- Check Railway API token is valid
- Verify service IDs are correct
- Check database connection
- Review service logs in Railway

### GitHub issues not created
- Verify GitHub token has correct permissions
- Check repository owner/name are correct
- Review service logs for API errors

### Claude not analyzing
- Verify GitHub Action workflow is enabled
- Check `CLAUDE_CODE_OAUTH_TOKEN` secret is set
- Ensure issue has `needs-claude-analysis` label

## Development

### Run tests
```bash
npm test
```

### Build
```bash
npm run build
```

### Run in production mode
```bash
npm start
```

## Architecture Decisions

**Why not call Claude API directly?**
- No Anthropic API key management needed
- Leverages existing Claude Code subscription
- Claude Code has full codebase context via MCP servers
- Separation of concerns: detection vs analysis
- More cost-effective

**Why Railway GraphQL API?**
- Official Railway API
- Real-time deployment logs
- Filter by severity level
- Structured log data

**Why Prisma + PostgreSQL?**
- Reuses existing database
- Type-safe queries
- Easy migrations
- Minimal overhead

## Future Enhancements

- [ ] Slack notifications for critical errors
- [ ] Custom error pattern configuration
- [ ] Machine learning for error classification
- [ ] Automatic issue closing when errors stop
- [ ] Weekly summary reports
- [ ] Dashboard for monitoring
