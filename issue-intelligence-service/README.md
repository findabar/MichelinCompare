# Issue Intelligence Service

Automated monitoring and issue management service that receives alerts from Grafana, investigates issues, attempts auto-remediation, and creates GitHub issues for real problems.

## Features

- **Alert Reception**: Receives webhook alerts from Grafana
- **Intelligent Investigation**:
  - Analyzes logs from Loki
  - Performs health checks on application
  - Reviews historical data
  - Matches against known issues database
- **Auto-Remediation**: Attempts to fix known issues automatically (max 1 attempt)
  - Service restart via Railway API
  - Database reconnection
  - Cache clearing
- **Slack Integration**: Real-time notifications with threaded updates
- **GitHub Integration**: Creates detailed, actionable issues
- **Knowledge Base**: Tracks known issues with solutions and auto-fix success rates

## Architecture

```
Grafana Alert → Investigation Queue → {
  1. Log Analysis (Loki)
  2. Health Checks
  3. Historical Analysis
  4. Known Issue Matching
  5. Validation
  6. Categorization
  7. Slack Notification
  8. Auto-Remediation (if applicable)
  9. GitHub Issue Creation (if needed)
}
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Bull (Redis-backed)
- **Integrations**: Grafana, Loki, Slack, GitHub, Railway

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Grafana with Loki
- Slack workspace with bot token
- GitHub personal access token
- Railway account with API token

### Installation

1. **Install dependencies**:
   ```bash
   cd issue-intelligence-service
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Seed known issues**:
   ```bash
   npm run seed
   ```

### Development

```bash
npm run dev
```

The service will start on `http://localhost:3003`

### Build

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

See [.env.example](.env.example) for all required environment variables.

Key configurations:

- **DATABASE_URL**: PostgreSQL connection string
- **REDIS_URL**: Redis connection string
- **GRAFANA_URL**: Grafana instance URL
- **LOKI_URL**: Loki instance URL
- **SLACK_BOT_TOKEN**: Slack bot token (xoxb-...)
- **GITHUB_TOKEN**: GitHub personal access token
- **RAILWAY_API_TOKEN**: Railway API token
- **RAILWAY_*_SERVICE_ID**: Railway service IDs for auto-restart

### Slack Setup

1. Create a new Slack App at https://api.slack.com/apps
2. Add bot scopes: `chat:write`, `chat:update`, `files:write`
3. Install app to workspace
4. Create channels: `#alerts-critical`, `#alerts-high`, `#alerts-medium`, `#alerts-resolved`
5. Add bot to channels
6. Copy bot token to `SLACK_BOT_TOKEN`
7. Copy channel IDs to environment variables

### Grafana Setup

1. Go to Grafana → Alerting → Contact Points
2. Add new contact point:
   - Name: "Issue Intelligence Service"
   - Type: Webhook
   - URL: `https://your-service.railway.app/alerts/grafana`
   - HTTP Method: POST
3. Create alert rules that send to this contact point

### Railway Setup

1. Get your Railway API token from https://railway.app/account/tokens
2. Get project ID and service IDs:
   ```bash
   railway status
   ```
3. Add tokens and IDs to environment variables

## API Endpoints

### POST /alerts/grafana
Receive Grafana webhook alerts

**Request Body**: Grafana alert payload

**Response**:
```json
{
  "success": true,
  "alertId": "HighErrorRate",
  "message": "Alert received and queued for investigation"
}
```

### GET /alerts/history
Get recent alert history

**Query Parameters**:
- `limit` (optional): Number of alerts to return (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "alertName": "HighErrorRate",
      "severity": "critical",
      "receivedAt": "2025-01-13T10:00:00Z",
      "isRealIssue": true,
      "confidence": 85,
      "githubIssueNumber": 123,
      "githubIssueUrl": "https://github.com/.../issues/123",
      "remediationAttempted": true,
      "remediationSuccess": false
    }
  ]
}
```

### GET /alerts/:id
Get alert details

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "alertName": "HighErrorRate",
    "logAnalysis": {...},
    "healthCheck": {...},
    "remediationAttempts": [...]
  }
}
```

### GET /health
Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:00:00Z",
  "database": "connected",
  "queue": {
    "waiting": 0,
    "active": 1,
    "completed": 42,
    "failed": 2
  }
}
```

## Known Issues Management

The service maintains a database of known issues with solutions. Initial issues are seeded automatically.

### Adding Known Issues

You can add known issues programmatically:

```typescript
await prisma.knownIssue.create({
  data: {
    title: 'Database Connection Pool Exhausted',
    errorPattern: '.*(connection pool|too many clients).*',
    description: 'Prisma connection pool has been exhausted',
    solution: 'Restart service to reset connection pool',
    autoRemediable: true,
    remediationScript: 'restart',
    category: 'database',
    component: 'backend-api',
    severity: 'critical',
    createdBy: 'system',
  },
});
```

## Deployment

### Railway Deployment

1. **Create new Railway service**:
   ```bash
   railway link
   railway up
   ```

2. **Set environment variables** in Railway dashboard

3. **Configure Grafana webhook** to point to Railway URL

4. **Monitor logs**:
   ```bash
   railway logs
   ```

### Resource Requirements

- **CPU**: 0.5 vCPU (scale to 1 vCPU under load)
- **Memory**: 512MB - 1GB
- **Redis**: Shared or dedicated instance
- **Database**: Can share PostgreSQL with main app

## Monitoring

The service itself should be monitored:

- Queue processing rate
- Alert response time
- False positive rate
- Auto-remediation success rate
- GitHub API rate limit usage

Set up alerts for:
- Queue backup (>100 pending jobs)
- Processing failures (>5 in 10 minutes)
- GitHub API failures

## Troubleshooting

### Alerts not being received

1. Check Grafana contact point configuration
2. Verify webhook URL is correct
3. Check service logs for errors
4. Test with manual curl:
   ```bash
   curl -X POST http://localhost:3003/alerts/grafana \
     -H "Content-Type: application/json" \
     -d @test/sample-alert.json
   ```

### Queue not processing

1. Check Redis connectivity
2. Verify Redis URL in environment
3. Check queue status: `GET /health`
4. Review worker logs

### Slack notifications not sent

1. Verify Slack bot token is valid
2. Check bot is added to channels
3. Verify channel IDs are correct
4. Check Slack API rate limits

### GitHub issues not created

1. Verify GitHub token has correct permissions (`repo` scope)
2. Check GitHub API rate limits
3. Verify repository name is correct
4. Review error logs

### Auto-remediation not working

1. Verify Railway API token is valid
2. Check service IDs are correct
3. Ensure Railway services have permission to restart
4. Review remediation attempt logs

## Development

### Running Tests

```bash
npm test
```

### Database Migrations

Create a new migration:
```bash
npx prisma migrate dev --name migration_name
```

### Prisma Studio

Open Prisma Studio to browse database:
```bash
npx prisma studio
```

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Create pull request

## License

MIT
