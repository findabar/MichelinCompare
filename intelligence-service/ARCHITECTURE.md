# Intelligence Service Architecture

## Overview

The Intelligence Service is a lightweight monitoring system that bridges Railway logs and Claude Code for automated error analysis.

## System Flow

```
┌─────────────────┐
│  Railway Logs   │
│  (Backend,      │
│   Frontend,     │
│   Scraper)      │
└────────┬────────┘
         │
         │ GraphQL API
         │ (every 10 min)
         ▼
┌─────────────────────────┐
│  Intelligence Service   │
│                         │
│  ┌──────────────────┐   │
│  │ Log Poller       │   │
│  │ - Fetch logs     │   │
│  │ - Filter errors  │   │
│  └─────┬────────────┘   │
│        │                │
│        ▼                │
│  ┌──────────────────┐   │
│  │ Error Detector   │   │
│  │ - Pattern match  │   │
│  │ - Group errors   │   │
│  │ - Generate sig   │   │
│  └─────┬────────────┘   │
│        │                │
│        ▼                │
│  ┌──────────────────┐   │
│  │ State Manager    │   │
│  │ - Check dups     │   │
│  │ - Track state    │   │
│  └─────┬────────────┘   │
│        │                │
│        ▼                │
│  ┌──────────────────┐   │
│  │ GitHub Creator   │   │
│  │ - Create issue   │   │
│  │ - Add labels     │   │
│  └─────┬────────────┘   │
└────────┼────────────────┘
         │
         │ GitHub API
         ▼
┌─────────────────┐
│  GitHub Issue   │
│  with label:    │
│  needs-claude-  │
│  analysis       │
└────────┬────────┘
         │
         │ Webhook
         ▼
┌──────────────────────┐
│  GitHub Action       │
│  (claude-issue-      │
│   handler.yml)       │
│                      │
│  ┌────────────────┐  │
│  │ Claude Code    │  │
│  │ - Read issue   │  │
│  │ - Read codebase│  │
│  │ - Access MCP   │  │
│  │ - Analyze      │  │
│  │ - Comment      │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │
           │ Update labels
           ▼
┌──────────────────────┐
│  GitHub Issue        │
│  - Claude comment    │
│  - Label changed to: │
│    claude-analyzed   │
└──────────────────────┘
```

## Components

### 1. Railway Log Poller
**File**: `src/services/railwayLogPoller.ts`

**Purpose**: Fetch deployment logs from Railway GraphQL API

**Key Functions**:
- `fetchLogsForService()`: Get logs for a specific service
- `fetchAllServiceLogs()`: Fetch logs from all services in parallel
- `fetchDeploymentLogs()`: Get logs from a specific deployment

**Tech**:
- `graphql-request` for Railway API
- Filters logs by severity level (`@level:error OR @level:warn`)
- Respects checkpoint timestamps to avoid duplicates

### 2. Error Detector
**File**: `src/services/errorDetector.ts`

**Purpose**: Parse logs and detect error patterns

**Key Functions**:
- `detectErrors()`: Main detection logic
- `analyzeErrorGroup()`: Analyze grouped error logs
- `groupErrorsBySignature()`: Deduplicate similar errors
- `mergeErrorOccurrences()`: Combine multiple instances

**Pattern Matching**:
- Database errors (connection, migrations, deadlocks)
- Auth errors (JWT, tokens)
- Network errors (CORS, timeouts)
- Scraper errors (Puppeteer)
- Memory errors (heap overflow)
- API errors (rate limits)

**Severity Levels**:
- Critical: Service-breaking errors
- High: Important but not blocking
- Medium: Should be addressed
- Low: Minor issues

### 3. GitHub Issue Creator
**File**: `src/services/githubIssueCreator.ts`

**Purpose**: Create and manage GitHub issues

**Key Functions**:
- `createIssue()`: Create new issue with formatted content
- `addCommentToIssue()`: Add comments for recurring errors
- `addLabels()` / `removeLabel()`: Label management
- `createRecurrenceComment()`: Update for repeated errors

**Issue Format**:
- Title: Emoji + Service + Error message
- Body: Structured markdown with error details
- Labels: `needs-claude-analysis`, service, severity, category
- Context: Links to Railway logs and service

### 4. State Manager
**File**: `src/services/stateManager.ts`

**Purpose**: Database operations and state tracking

**Key Functions**:
- `getLastCheckTime()`: Get checkpoint for service
- `updateLastCheckTime()`: Update checkpoint
- `findExistingIssue()`: Check for duplicates
- `createIssue()`: Store new issue
- `updateIssueOccurrence()`: Update recurrence count
- `markIssueAsAnalyzed()`: Track Claude analysis

**Database Models**:
- `LogCheckpoint`: Last check time per service
- `DetectedIssue`: Tracked errors and GitHub issues

### 5. Cron Job
**File**: `src/cron.ts`

**Purpose**: Orchestrate the monitoring process

**Flow**:
1. Get last check time for each service
2. Fetch logs since last check
3. Detect errors in logs
4. Group errors by signature
5. Check for existing issues
6. Create new issues or update existing ones
7. Update checkpoint

**Configuration**:
- Polling interval: Configurable via env var
- Default: Every 10 minutes
- Prevents overlapping runs

### 6. Express Server
**File**: `src/server.ts`

**Purpose**: HTTP server for health checks and manual triggers

**Endpoints**:
- `GET /health`: Health check
- `POST /trigger-check`: Manual trigger
- `GET /stats`: Statistics
- `GET /status`: Current status

**Features**:
- Graceful shutdown
- Prevents concurrent runs
- Cron job scheduling

## Data Flow

### New Error Detection
1. Cron job triggers every 10 minutes
2. Poll Railway logs since last checkpoint
3. Parse and filter error-level logs
4. Apply pattern matching to detect known errors
5. Group consecutive errors (within 5 min window)
6. Generate unique signature for each error type
7. Check database for existing issue with same signature
8. If new: Create GitHub issue with `needs-claude-analysis` label
9. If existing: Add comment about recurrence
10. Update database with occurrence count and timestamp
11. Update checkpoint to current time

### Claude Analysis
1. GitHub webhook triggers on issue labeled
2. GitHub Action starts Claude Code
3. Claude reads issue description and logs
4. Claude accesses codebase via checkout
5. Claude uses Railway MCP to view service status
6. Claude uses GitHub MCP for repo context
7. Claude analyzes root cause
8. Claude comments with fix suggestions
9. GitHub Action removes `needs-claude-analysis` label
10. GitHub Action adds `claude-analyzed` label
11. Intelligence Service can detect label change (future)

## Error Signature Algorithm

Purpose: Create unique identifier for each error type to prevent duplicates

```typescript
generateErrorSignature(message, category) {
  // Normalize message
  const normalized = message
    .toLowerCase()              // Case-insensitive
    .replace(/\d+/g, 'N')       // Replace numbers with N
    .replace(/['"]/g, '')       // Remove quotes
    .replace(/\s+/g, '-')       // Spaces to hyphens
    .substring(0, 100);         // Limit length

  return `${category}-${normalized}`;
}
```

Example:
- Input: "Connection ECONNREFUSED 127.0.0.1:5432"
- Category: "database"
- Output: `database-connection-econnrefused-N.N.N.N:N`

## Database Schema

### LogCheckpoint
```prisma
model LogCheckpoint {
  id            String   @id @default(cuid())
  serviceName   String   @unique
  lastCheckTime DateTime
  updatedAt     DateTime @updatedAt
}
```

**Purpose**: Track last successful log check for each service
**Why**: Prevents processing the same logs multiple times

### DetectedIssue
```prisma
model DetectedIssue {
  id                String   @id @default(cuid())
  githubIssueNumber Int      @unique
  errorSignature    String   @unique
  serviceName       String
  errorMessage      String   @db.Text
  firstSeen         DateTime
  lastSeen          DateTime
  occurrenceCount   Int      @default(1)
  claudeAnalyzed    Boolean  @default(false)
  resolved          Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Purpose**: Track detected errors and their GitHub issues
**Why**: Deduplication and recurrence tracking

## Configuration

### Environment Variables

**Railway API**:
- `RAILWAY_API_TOKEN`: API access token
- `RAILWAY_PROJECT_ID`: Project identifier
- `RAILWAY_ENVIRONMENT_ID`: Environment (prod/staging)
- `{SERVICE}_SERVICE_ID`: Individual service IDs

**GitHub API**:
- `GITHUB_TOKEN`: Personal access token
- `GITHUB_REPO_OWNER`: Repository owner
- `GITHUB_REPO_NAME`: Repository name

**Database**:
- `DATABASE_URL`: PostgreSQL connection string

**Config**:
- `POLLING_INTERVAL_MINUTES`: Check frequency (default: 10)
- `NODE_ENV`: Environment mode
- `PORT`: HTTP server port

## Security Considerations

1. **API Tokens**: Stored in Railway environment variables, never in code
2. **Database**: Uses same database as main app (no additional exposure)
3. **GitHub**: Limited scope PAT (only repo + issues:write)
4. **Railway**: Read-only API access for log fetching
5. **Network**: All API calls over HTTPS

## Performance Characteristics

**Memory Usage**: ~128MB
- Minimal in-memory state
- Uses Prisma connection pooling
- Processes logs in batches

**Network Usage**: ~500MB/month
- Polls Railway API every 10 minutes
- GitHub API calls only when errors detected
- Typical: 4-6 API calls per polling cycle

**Database Load**: Minimal
- Only 2 tables
- Simple queries
- Infrequent writes

**Latency**:
- Log fetch: ~2-3 seconds
- Error detection: <1 second
- GitHub issue creation: ~1 second
- Total cycle: ~5-10 seconds

## Error Recovery

**Railway API Failure**:
- Logs error and continues
- Next poll will catch missed logs
- Checkpoint not updated on failure

**GitHub API Failure**:
- Logs error
- Does not update database
- Will retry on next poll

**Database Failure**:
- Service continues but loses state
- Falls back to default checkpoint (15 min ago)
- Manual recovery may be needed

**Concurrent Runs**:
- `isRunning` flag prevents overlaps
- Skips cycle if previous still running

## Monitoring

**Health Indicators**:
- HTTP health endpoint responds
- Cron job runs successfully
- No repeated API failures in logs

**Success Metrics**:
- Errors detected vs errors in logs
- Issues created vs unique errors
- Claude analysis completion rate

**Alerts** (manual setup):
- Service downtime
- Repeated API failures
- Database connection errors

## Future Enhancements

1. **Webhook from GitHub**: Detect when Claude comments to mark as analyzed
2. **Auto-close**: Close issues when errors stop occurring
3. **Slack Integration**: Notify team of critical errors
4. **Dashboard**: Web UI for monitoring
5. **Custom Patterns**: User-defined error patterns
6. **ML Classification**: Learn error patterns over time
7. **Metrics Export**: Prometheus/Grafana integration
