# Automated Monitoring and Issue Management System Design

## Overview

An intelligent monitoring service that receives alerts from Grafana/Loki, validates issues through investigation, categorizes them, and automatically creates GitHub issues for real problems.

## Architecture

```
┌─────────────────┐
│   Railway App   │
│   (Backend)     │
└────────┬────────┘
         │ logs
         ▼
┌─────────────────┐
│   Locomotive    │
│  (Log Shipper)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Loki          │
│  (Log Storage)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Grafana       │
│  (Visualization │
│   + Alerting)   │
└────────┬────────┘
         │ webhook alert
         ▼
┌─────────────────────────────────────┐
│   Issue Intelligence Service (NEW)   │
│                                      │
│  1. Alert Receiver                   │
│  2. Investigation Engine             │
│  3. Categorization System            │
│  4. GitHub Issue Creator             │
└──────────────────┬──────────────────┘
                   │
                   ▼
              ┌─────────┐
              │ GitHub  │
              │ Issues  │
              └─────────┘
```

## Components

### 1. Alert Receiver Service
**Purpose**: Receives webhook alerts from Grafana

**Endpoints**:
- `POST /alerts/grafana` - Receives Grafana webhook alerts
- `GET /health` - Health check
- `GET /alerts/history` - Recent alert history (for debugging)

**Alert Types to Monitor**:
- HTTP 5xx errors (>10 in 5 minutes)
- HTTP 4xx errors (>50 in 5 minutes, excluding 401/404)
- Database connection failures
- Response time degradation (>3s average over 5 minutes)
- Memory/CPU threshold breaches
- Application crashes/restarts
- Authentication failures spike

### 2. Investigation Engine
**Purpose**: Validates if the alert represents a real, actionable issue

**Investigation Steps**:

#### Step 1: Context Gathering
```typescript
interface AlertContext {
  timestamp: Date;
  alertName: string;
  severity: 'critical' | 'warning' | 'info';
  affectedService: string;
  logQuery: string;
  metrics: {
    errorCount: number;
    timeWindow: string;
    affectedEndpoints?: string[];
  };
}
```

#### Step 2: Log Analysis
- Query Loki for related logs (±15 minutes from alert)
- Extract error patterns, stack traces, user IDs
- Identify correlated events
- Check for duplicate/similar errors

```typescript
interface LogAnalysis {
  errorMessages: string[];
  stackTraces: string[];
  affectedEndpoints: string[];
  affectedUsers?: number;
  errorPattern?: string;
  firstOccurrence: Date;
  lastOccurrence: Date;
  frequency: number;
}
```

#### Step 3: Health Checks
- Ping application `/health` endpoint
- Check database connectivity
- Verify external service dependencies
- Test critical user flows (if applicable)

```typescript
interface HealthCheck {
  apiResponsive: boolean;
  databaseConnected: boolean;
  responseTime: number;
  externalServices: {
    [key: string]: 'up' | 'down' | 'degraded';
  };
}
```

#### Step 4: Historical Analysis
- Check if this is a recurring issue
- Look for existing open GitHub issues
- Compare with past incidents (stored in local DB)

```typescript
interface HistoricalContext {
  isRecurring: boolean;
  lastOccurrence?: Date;
  openGitHubIssue?: number;
  totalOccurrences: number;
  meanTimeBetweenOccurrences?: number;
}
```

#### Step 5: Check Known Issues Database
```typescript
interface KnownIssue {
  id: string;
  errorPattern: string; // regex or exact match
  title: string;
  description: string;
  solution: string;
  autoRemediable: boolean;
  remediationScript?: string;
  category: string;
  component: string;
  occurrences: number;
  lastSeen: Date;
}
```

**Known Issue Matching**:
- Compare error patterns against knowledge base
- If match found and `autoRemediable = true`, attempt automatic fix
- If match found but not auto-remediable, create issue with solution attached
- If no match, proceed to create new issue and suggest adding to knowledge base

#### Step 6: Validation Decision
```typescript
interface ValidationResult {
  isRealIssue: boolean;
  confidence: number; // 0-100
  reason: string;
  shouldCreateIssue: boolean;
  shouldUpdateExisting?: number; // issue number
  knownIssue?: KnownIssue;
  shouldAttemptRemediation: boolean;
}
```

**Validation Rules** (Low Threshold - Favor False Positives):
- ✅ Real Issue: Any error with health check failures
- ✅ Real Issue: Sustained errors (>3 occurrences in 5 minutes)
- ✅ Real Issue: Critical errors with stack traces
- ✅ Real Issue: Performance degradation >2x baseline
- ⚠️ Possible Issue: Single occurrence with stack trace (create issue, lower priority)
- ❌ False Positive: Known temporary condition (e.g., deployment in progress)
- ❌ False Positive: User error (4xx except 429) with no service impact
- 🔄 Update Existing: Matches open issue + new information available
- 🔧 Auto-Remediate: Matches known issue with solution

### 3. Categorization System
**Purpose**: Classify validated issues for proper routing and prioritization

**Categories**:

```typescript
enum IssueCategory {
  // Severity
  CRITICAL = 'critical',      // Service down, data loss
  HIGH = 'high',              // Major feature broken
  MEDIUM = 'medium',          // Degraded performance
  LOW = 'low',                // Minor issues

  // Type
  BUG = 'bug',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  INFRASTRUCTURE = 'infrastructure',
  DATABASE = 'database',

  // Component
  BACKEND_API = 'backend-api',
  FRONTEND = 'frontend',
  SCRAPER = 'scraper',
  AUTH = 'authentication',
  DATABASE_LAYER = 'database'
}

interface IssueCategorization {
  severity: IssueCategory;
  type: IssueCategory;
  component: IssueCategory;
  labels: string[];
  assignTeam?: string;
}
```

**Categorization Logic**:
```typescript
// Severity Rules
if (healthCheck.apiResponsive === false) severity = CRITICAL
if (errorRate > 50% && affectedUsers > 10) severity = CRITICAL
if (errorRate > 10% || responseTime > 5s) severity = HIGH
if (errorRate > 1% || responseTime > 3s) severity = MEDIUM
else severity = LOW

// Type Rules
if (errorMessage.includes('SQL', 'Prisma', 'database')) type = DATABASE
if (errorMessage.includes('timeout', 'slow', 'performance')) type = PERFORMANCE
if (errorMessage.includes('auth', 'token', 'unauthorized')) type = SECURITY
if (statusCode >= 500) type = BUG

// Component Rules
if (endpoint.startsWith('/api')) component = BACKEND_API
if (errorSource === 'React') component = FRONTEND
if (service === 'scraper') component = SCRAPER
```

### 4. Auto-Remediation Engine
**Purpose**: Attempt to fix known issues automatically before creating tickets

**Remediation Strategies**:

```typescript
interface RemediationStrategy {
  name: string;
  condition: (context: AlertContext) => boolean;
  action: () => Promise<RemediationResult>;
  maxAttempts: 1; // Only try once
  rollbackOnFailure?: boolean;
}

interface RemediationResult {
  attempted: boolean;
  success: boolean;
  action: string;
  logs: string[];
  shouldCreateIssue: boolean;
}
```

**Available Remediations**:

1. **Service Restart**
   - Condition: Service unresponsive or high error rate (>50%)
   - Action: Trigger Railway service restart via API
   - Max attempts: 1
   - Wait: 30s for health check
   - Create issue if: Restart fails OR issue persists after restart

2. **Database Connection Reset**
   - Condition: Database connection errors
   - Action: Prisma client disconnect/reconnect
   - Max attempts: 1
   - Create issue if: Reconnection fails

3. **Cache Clear**
   - Condition: Stale data errors or cache-related issues
   - Action: Clear Redis/memory cache
   - Max attempts: 1
   - Create issue if: Issue persists after clear

4. **Memory Cleanup**
   - Condition: Memory threshold exceeded (>90%)
   - Action: Trigger garbage collection + clear caches
   - Max attempts: 1
   - Create issue if: Memory doesn't decrease

**Remediation Flow**:
```
Alert Received → Investigation → Known Issue Match?
                                        ↓ Yes
                                  Auto-remediable?
                                        ↓ Yes
                              Attempt Remediation (1x)
                                        ↓
                              Success? → Send Slack notification
                                   ↓ No
                          Create GitHub Issue + Slack alert
```

**Railway API Integration**:
```typescript
// Restart service via Railway API
async function restartRailwayService(serviceId: string) {
  const response = await axios.post(
    `https://backboard.railway.app/graphql`,
    {
      query: `
        mutation serviceInstanceRedeploy($serviceId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId)
        }
      `,
      variables: { serviceId }
    },
    {
      headers: {
        Authorization: `Bearer ${RAILWAY_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}
```

### 5. Slack Integration
**Purpose**: Real-time notifications for team awareness

**Slack Channels Strategy**:
- `#alerts-critical` - Critical issues requiring immediate attention
- `#alerts-high` - High priority issues
- `#alerts-medium` - Medium/low priority issues
- `#alerts-resolved` - Auto-resolved issues (via remediation)

**Notification Format**:

```typescript
// Critical Alert (service down)
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 CRITICAL: Backend API Unresponsive"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Severity:*\nCritical"
        },
        {
          "type": "mrkdwn",
          "text": "*Component:*\nBackend API"
        },
        {
          "type": "mrkdwn",
          "text": "*Affected Users:*\nAll users"
        },
        {
          "type": "mrkdwn",
          "text": "*Error Rate:*\n100%"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Auto-Remediation:*\n⚙️ Attempting service restart..."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View in Grafana"
          },
          "url": "https://grafana.railway.app/..."
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Logs"
          },
          "url": "https://grafana.railway.app/explore?..."
        }
      ]
    }
  ]
}

// Remediation Success
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "✅ *Auto-Remediation Successful*\nService restarted and health checks passing\n_No issue created_"
      }
    }
  ]
}

// Remediation Failed - Issue Created
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "❌ *Auto-Remediation Failed*\nService restart attempted but issue persists\n\n📋 GitHub Issue Created: <https://github.com/findabar/MichellinCompare/issues/123|#123>"
      }
    }
  ]
}
```

**Slack Interactive Actions**:
- "Acknowledge" - Marks alert as acknowledged by human
- "View Logs" - Deep link to Loki with time range
- "View in Grafana" - Link to relevant dashboard
- "Escalate" - Mention on-call engineer
- "Mark as False Positive" - Add to ignore patterns

### 6. GitHub Issue Creator
**Purpose**: Create well-formatted, actionable GitHub issues

**Issue Template**:

```markdown
## 🚨 Automated Alert: [Category] [Brief Description]

**Severity**: {severity}
**Component**: {component}
**First Detected**: {timestamp}
**Status**: Investigating

---

### Problem Summary
{auto-generated summary of the issue}

### Impact
- **Affected Users**: {count or "Unknown"}
- **Error Rate**: {percentage}
- **Time Window**: {duration}
- **Affected Endpoints**: {list}

### Error Details
```
{primary error message}
```

**Stack Trace** (if available):
```
{stack trace}
```

### Investigation Results
- ✅ API Responsive: {yes/no}
- ✅ Database Connected: {yes/no}
- ⚠️ Response Time: {ms}
- 📊 Error Frequency: {count} occurrences in {timeWindow}

### Related Logs
**Loki Query**:
```
{logQuery}
```

**Sample Log Entries**:
```
{top 3-5 relevant log lines}
```

### Historical Context
{if recurring}
- This issue has occurred {count} times previously
- Last occurrence: {date}
- Related issues: #{issue_numbers}

### Auto-Remediation Attempted
{if remediation was attempted}
**Action Taken**: Service restart attempted at {timestamp}
**Result**: ❌ Failed - Issue persisted after restart
**Logs**:
```
{remediation logs}
```

### Known Issue Match
{if matched against knowledge base}
**Matched Known Issue**: [{knownIssue.title}](#known-issue-{id})
**Solution**: {knownIssue.solution}
**Previous Occurrences**: {count}

### Recommended Actions
{AI-generated suggestions based on error type + known solutions}

---

**Alert ID**: {unique_id}
**Grafana Dashboard**: [View in Grafana]({link})
**Raw Alert Data**:
<details>
<summary>Click to expand</summary>

```json
{alert payload}
```
</details>

---
*This issue was automatically created by the Issue Intelligence Service*
*Last updated: {timestamp}*
```

**GitHub API Integration**:
```typescript
interface GitHubIssueConfig {
  repo: 'findabar/MichellinCompare'; // or your org/repo
  labels: string[]; // from categorization
  assignees?: string[]; // based on component
  milestone?: string;
  project?: string; // add to project board
}
```

## Implementation Details

### Tech Stack
- **Language**: TypeScript (consistent with backend)
- **Framework**: Express.js (lightweight API server)
- **Database**: PostgreSQL (shared with main app) or SQLite (standalone)
- **HTTP Client**: Axios (for Grafana/GitHub API calls)
- **Job Queue**: Bull (with Redis) for async processing
- **Logging**: Winston + Loki integration

### Database Schema

```prisma
model AlertEvent {
  id                String   @id @default(uuid())
  alertId           String   @unique
  alertName         String
  severity          String
  receivedAt        DateTime @default(now())

  // Investigation
  investigatedAt    DateTime?
  isRealIssue       Boolean?
  confidence        Float?
  validationReason  String?

  // Categorization
  category          String?
  type              String?
  component         String?

  // Auto-remediation
  remediationAttempted Boolean @default(false)
  remediationSuccess   Boolean?
  remediationStrategy  String?

  // Slack notification
  slackMessageTs    String?  // Slack message timestamp for threading
  slackChannel      String?

  // GitHub Integration
  githubIssueNumber Int?
  githubIssueUrl    String?
  createdIssueAt    DateTime?

  // Context
  logAnalysis       Json?
  healthCheck       Json?
  historicalContext Json?
  rawAlertPayload   Json

  // Relations
  updates           AlertUpdate[]
  remediationAttempts RemediationAttempt[]

  @@index([alertName, receivedAt])
  @@index([githubIssueNumber])
  @@index([slackMessageTs])
}

model AlertUpdate {
  id           String      @id @default(uuid())
  alertEventId String
  alertEvent   AlertEvent  @relation(fields: [alertEventId], references: [id])

  timestamp    DateTime    @default(now())
  updateType   String      // 'resolved', 'escalated', 'comment'
  details      Json

  @@index([alertEventId])
}

model IssuePattern {
  id              String   @id @default(uuid())
  pattern         String   // error message pattern
  category        String
  component       String
  knownFalsePositive Boolean @default(false)
  occurrences     Int      @default(1)
  lastSeen        DateTime @default(now())

  @@index([pattern])
}

model KnownIssue {
  id                String   @id @default(uuid())
  title             String
  errorPattern      String   // regex pattern to match errors
  description       String
  solution          String   @db.Text
  autoRemediable    Boolean  @default(false)
  remediationScript String?  @db.Text
  category          String
  component         String
  severity          String

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String   // 'system' or user email
  occurrences       Int      @default(0)
  lastSeen          DateTime?

  // GitHub reference (if originated from an issue)
  githubIssueNumber Int?
  githubIssueUrl    String?

  // Success metrics
  autoFixSuccessCount Int    @default(0)
  autoFixFailCount    Int    @default(0)

  @@index([errorPattern])
  @@index([component, category])
}

model RemediationAttempt {
  id                String      @id @default(uuid())
  alertEventId      String
  alertEvent        AlertEvent  @relation(fields: [alertEventId], references: [id])
  knownIssueId      String?
  knownIssue        KnownIssue? @relation(fields: [knownIssueId], references: [id])

  attemptedAt       DateTime    @default(now())
  strategy          String      // 'restart', 'cache_clear', etc.
  success           Boolean
  errorMessage      String?
  logs              Json?

  @@index([alertEventId])
  @@index([knownIssueId])
}
```

### Service Architecture

```typescript
// src/index.ts
import express from 'express';
import { alertRouter } from './routes/alerts';
import { investigationQueue } from './queues/investigation';

const app = express();
app.use(express.json());
app.use('/alerts', alertRouter);

// src/routes/alerts.ts
export const alertRouter = express.Router();

alertRouter.post('/grafana', async (req, res) => {
  const alert = parseGrafanaAlert(req.body);

  // Immediately acknowledge receipt
  res.json({ success: true, alertId: alert.id });

  // Queue for async investigation
  await investigationQueue.add('investigate', {
    alert,
    receivedAt: new Date()
  });
});

// src/queues/investigation.ts
investigationQueue.process('investigate', async (job) => {
  const { alert } = job.data;

  // Step 1: Gather context
  const context = await gatherContext(alert);

  // Step 2: Analyze logs
  const logAnalysis = await analyzeLogs(context);

  // Step 3: Health checks
  const healthCheck = await performHealthChecks(alert.service);

  // Step 4: Historical analysis
  const historical = await checkHistoricalData(alert);

  // Step 5: Check known issues
  const knownIssue = await matchKnownIssue(logAnalysis);

  // Step 6: Validate
  const validation = await validateIssue({
    context,
    logAnalysis,
    healthCheck,
    historical,
    knownIssue
  });

  // Save to database
  const alertEvent = await saveAlertEvent({ ...validation, alert });

  // Step 7: Send initial Slack notification
  const slackMessage = await sendSlackAlert({
    alert,
    validation,
    severity: categorization.severity
  });

  await updateAlertEvent(alert.id, {
    slackMessageTs: slackMessage.ts,
    slackChannel: slackMessage.channel
  });

  // Step 8: Attempt auto-remediation if applicable
  let remediationResult = null;
  if (validation.shouldAttemptRemediation && knownIssue?.autoRemediable) {
    remediationResult = await attemptRemediation({
      alert,
      knownIssue,
      alertEventId: alertEvent.id
    });

    // Update Slack thread with remediation status
    await updateSlackThread(slackMessage.ts, slackMessage.channel, {
      remediation: remediationResult
    });

    // If remediation successful, we're done!
    if (remediationResult.success) {
      await markAlertResolved(alertEvent.id);
      return;
    }
  }

  // Step 9: Categorize
  if (validation.isRealIssue) {
    const categorization = await categorizeIssue({
      logAnalysis,
      healthCheck,
      knownIssue
    });

    // Step 10: Create GitHub issue (only if remediation failed or not attempted)
    if (validation.shouldCreateIssue) {
      const issue = await createGitHubIssue({
        alert,
        validation,
        categorization,
        logAnalysis,
        healthCheck,
        knownIssue,
        remediationResult
      });

      await updateAlertEvent(alert.id, {
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url
      });

      // Update Slack with GitHub issue link
      await updateSlackThread(slackMessage.ts, slackMessage.channel, {
        githubIssue: issue
      });
    }
  }
});
```

### Configuration

```typescript
// config/monitoring.ts
export const config = {
  grafana: {
    url: process.env.GRAFANA_URL,
    apiKey: process.env.GRAFANA_API_KEY
  },

  loki: {
    url: process.env.LOKI_URL,
    queryTimeout: 30000
  },

  github: {
    token: process.env.GITHUB_TOKEN,
    owner: 'findabar',
    repo: 'MichellinCompare',
    defaultLabels: ['automated-alert', 'needs-triage']
  },

  slack: {
    token: process.env.SLACK_BOT_TOKEN,
    channels: {
      critical: 'C01234567', // #alerts-critical
      high: 'C01234568',     // #alerts-high
      medium: 'C01234569',   // #alerts-medium
      resolved: 'C01234570'  // #alerts-resolved
    }
  },

  railway: {
    apiToken: process.env.RAILWAY_API_TOKEN,
    projectId: process.env.RAILWAY_PROJECT_ID,
    services: {
      backend: process.env.RAILWAY_BACKEND_SERVICE_ID,
      frontend: process.env.RAILWAY_FRONTEND_SERVICE_ID,
      scraper: process.env.RAILWAY_SCRAPER_SERVICE_ID
    }
  },

  application: {
    healthEndpoint: process.env.APP_HEALTH_URL || 'https://your-app.railway.app/health',
    apiUrl: process.env.APP_API_URL
  },

  validation: {
    // LOW THRESHOLD - Favor catching issues over false negatives
    minErrorCount: 3,           // Reduced from 5
    minConfidence: 60,          // Reduced from 70
    healthCheckTimeout: 10000,

    // Single error with stack trace = issue (unless known false positive)
    createIssueOnSingleErrorWithStackTrace: true,

    // Deduplication window
    deduplicationWindow: 3600000 // 1 hour in ms
  },

  remediation: {
    enabled: true,
    maxAttempts: 1, // Only try once per alert
    strategies: {
      restart: {
        enabled: true,
        waitForHealthCheck: 30000, // 30s
        healthCheckRetries: 3
      },
      cacheReset: {
        enabled: true,
        waitTime: 5000 // 5s
      },
      dbReconnect: {
        enabled: true,
        timeout: 10000 // 10s
      }
    }
  },

  issueCreation: {
    // Rate limiting to avoid spam
    maxIssuesPerHour: 10,

    // Auto-close conditions
    autoCloseAfterHours: 24, // if no new occurrences

    // Team assignments
    componentTeams: {
      'backend-api': ['@backend-team'],
      'frontend': ['@frontend-team'],
      'scraper': ['@data-team']
    }
  }
};
```

## Deployment

### Railway Service Setup

1. **Create new Railway service** for Issue Intelligence Service
2. **Environment variables**:
   ```
   DATABASE_URL=postgresql://...
   GRAFANA_URL=https://your-grafana.railway.app
   GRAFANA_API_KEY=glsa_...
   LOKI_URL=https://your-loki.railway.app
   GITHUB_TOKEN=ghp_...
   SLACK_BOT_TOKEN=xoxb-...
   SLACK_CHANNEL_CRITICAL=C01234567
   SLACK_CHANNEL_HIGH=C01234568
   SLACK_CHANNEL_MEDIUM=C01234569
   SLACK_CHANNEL_RESOLVED=C01234570
   RAILWAY_API_TOKEN=...
   RAILWAY_PROJECT_ID=...
   RAILWAY_BACKEND_SERVICE_ID=...
   RAILWAY_FRONTEND_SERVICE_ID=...
   RAILWAY_SCRAPER_SERVICE_ID=...
   APP_HEALTH_URL=https://michelin-backend.railway.app/health
   APP_API_URL=https://michelin-backend.railway.app/api
   REDIS_URL=redis://...
   NODE_ENV=production
   ```

3. **Configure Grafana Alert Contact Point**:
   - Go to Grafana → Alerting → Contact Points
   - Add new contact point: "Issue Intelligence Service"
   - Type: Webhook
   - URL: `https://issue-intelligence.railway.app/alerts/grafana`
   - HTTP Method: POST

4. **Setup Alert Rules in Grafana**:
   ```yaml
   # Example alert rule
   - alert: HighErrorRate
     expr: |
       sum(rate(http_requests_total{status=~"5.."}[5m]))
       / sum(rate(http_requests_total[5m])) > 0.05
     for: 5m
     labels:
       severity: critical
       component: backend-api
     annotations:
       summary: "High error rate detected"
   ```

### Resource Requirements
- **CPU**: 0.5 vCPU (can scale to 1 vCPU under load)
- **Memory**: 512MB (1GB recommended)
- **Redis**: Shared or dedicated instance for Bull queue
- **Database**: Can share PostgreSQL with main app

## Testing Strategy

### 1. Unit Tests
- Alert parsing logic
- Validation rules
- Categorization algorithms
- GitHub issue formatting

### 2. Integration Tests
- Mock Grafana webhooks
- Loki query responses
- GitHub API interactions
- Database operations

### 3. Manual Testing
```bash
# Send test alert
curl -X POST http://localhost:3003/alerts/grafana \
  -H "Content-Type: application/json" \
  -d @test/fixtures/sample-alert.json

# Check alert processing
curl http://localhost:3003/alerts/history
```

### 4. Staging Environment
- Deploy to Railway staging
- Configure test alerts in Grafana
- Validate end-to-end flow
- Test with actual production-like logs

## Monitoring the Monitor

**Meta-monitoring** (monitor the monitoring service itself):

1. **Health Checks**:
   - Service uptime
   - Queue processing rate
   - Alert response time

2. **Metrics to Track**:
   - Alerts received per hour
   - False positive rate
   - Issues created per day
   - Investigation time (p50, p95)
   - GitHub API rate limit usage

3. **Alerting for the Alerting Service**:
   - Queue backup (>100 pending jobs)
   - Processing failures (>5 in 10 minutes)
   - GitHub API failures

## Known Issues Management

### Knowledge Base System

**Purpose**: Build a library of known issues with solutions that improves over time

**Structure**:
```typescript
interface KnownIssueEntry {
  title: string;
  errorPattern: string; // regex
  description: string;
  solution: string; // markdown formatted
  autoRemediable: boolean;
  remediationScript?: string;

  // Metadata
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  component: string;
  tags: string[];

  // Learning metrics
  occurrences: number;
  autoFixSuccessRate: number;
  lastSeen: Date;
  createdBy: string; // 'system' or user email
}
```

**Building the Knowledge Base**:

1. **Manual Entry via Admin UI**:
   ```
   POST /api/known-issues
   {
     "title": "Database Connection Pool Exhausted",
     "errorPattern": ".*connection pool timeout.*|.*too many clients.*",
     "solution": "**Root Cause**: Prisma connection pool exhausted...",
     "autoRemediable": true,
     "remediationScript": "reconnect-db"
   }
   ```

2. **Suggested from Resolved Issues**:
   - After GitHub issue is closed, system suggests adding to knowledge base
   - Parses issue comments for solution
   - Engineer reviews and approves

3. **Pattern Learning**:
   - System identifies recurring error patterns
   - Suggests creating knowledge base entry
   - Includes frequency, affected components

**Admin UI Features**:
- `/admin/known-issues` - List all known issues
- `/admin/known-issues/new` - Add new entry
- `/admin/known-issues/:id/edit` - Edit existing
- `/admin/known-issues/:id/test` - Test error pattern matching
- `/admin/known-issues/suggestions` - AI-suggested entries based on patterns

**Knowledge Base Seeding**:
Initial set of common issues (examples):

```json
[
  {
    "title": "Database Connection Pool Exhausted",
    "errorPattern": ".*(connection pool|too many clients).*",
    "solution": "Restart service to reset connection pool",
    "autoRemediable": true,
    "remediationScript": "restart",
    "component": "database"
  },
  {
    "title": "Redis Connection Lost",
    "errorPattern": ".*ECONNREFUSED.*redis.*",
    "solution": "Check Redis service status, restart if needed",
    "autoRemediable": true,
    "remediationScript": "reconnect-redis",
    "component": "infrastructure"
  },
  {
    "title": "Memory Leak - High Memory Usage",
    "errorPattern": ".*heap out of memory.*|.*JavaScript heap.*",
    "solution": "Restart service and investigate memory leak",
    "autoRemediable": true,
    "remediationScript": "restart",
    "component": "backend-api"
  },
  {
    "title": "JWT Token Expired",
    "errorPattern": ".*jwt expired.*|.*token.*expired.*",
    "solution": "Not a service issue - users need to re-authenticate",
    "autoRemediable": false,
    "component": "authentication"
  },
  {
    "title": "External API Timeout",
    "errorPattern": ".*(geocoding|external).*timeout.*",
    "solution": "External service issue, implement retry with backoff",
    "autoRemediable": false,
    "component": "backend-api"
  }
]
```

**Continuous Improvement**:
- Track auto-fix success rates
- Deprecate ineffective remediations
- Suggest pattern refinements based on false positives
- Export/import knowledge base for disaster recovery

## Future Enhancements

### Phase 2
- **ML-based categorization**: Train model on historical issues
- **Incident correlation**: Group related alerts into single incident
- **Anomaly detection**: Alert on unusual patterns (not just thresholds)
- **Cost impact tracking**: Calculate infrastructure cost of incidents

### Phase 3
- **Root cause analysis with LLM**: Use Claude/GPT to analyze logs and suggest fixes
- **PR generation**: Automatically create fix PRs for common issues
- **Predictive alerts**: Alert before issues occur based on trends
- **Runbook automation**: Execute complex multi-step remediation procedures
- **Integration with PagerDuty/OpsGenie**: For on-call rotations

## Security Considerations

1. **API Authentication**:
   - Verify Grafana webhook signatures
   - Use GitHub App for better permission control

2. **Secrets Management**:
   - Store tokens in Railway environment variables
   - Rotate GitHub tokens regularly
   - Use least-privilege principle

3. **Rate Limiting**:
   - Limit incoming alerts (prevent DoS)
   - Respect GitHub API rate limits
   - Implement exponential backoff

4. **Data Privacy**:
   - Sanitize sensitive data in logs before posting to GitHub
   - Redact user emails, passwords, tokens
   - GDPR compliance for user data

## Cost Estimate

**Railway Resources**:
- Service: ~$5-10/month (0.5 vCPU, 512MB RAM)
- Redis (if dedicated): ~$5/month
- Shared PostgreSQL: $0 (using existing)

**Total**: ~$10-15/month

**GitHub API**: Free (60 requests/hour should be sufficient)

## Getting Started Checklist

### Phase 1: Setup & Core Features
- [ ] Review and approve design
- [ ] Create Slack App and get bot token
  - [ ] Create channels: #alerts-critical, #alerts-high, #alerts-medium, #alerts-resolved
  - [ ] Add bot to channels
  - [ ] Configure scopes: chat:write, chat:update, files:write
- [ ] Get Railway API tokens
  - [ ] Project ID
  - [ ] Service IDs for backend/frontend/scraper
- [ ] Set up GitHub repository structure
  - [ ] Create `/issue-intelligence-service` directory
  - [ ] Initialize TypeScript project
  - [ ] Set up Prisma
- [ ] Create Railway service for Issue Intelligence
- [ ] Set up PostgreSQL database schema
- [ ] Set up Redis for job queue

### Phase 2: Core Implementation
- [ ] Implement alert receiver endpoint
- [ ] Implement investigation engine (5 steps)
- [ ] Implement known issues matching
- [ ] Implement auto-remediation engine
  - [ ] Service restart strategy
  - [ ] Database reconnect strategy
  - [ ] Cache clear strategy
- [ ] Implement Slack integration
  - [ ] Alert notifications
  - [ ] Threaded updates
  - [ ] Interactive buttons
- [ ] Implement categorization system
- [ ] Implement GitHub integration
  - [ ] Issue creation
  - [ ] Issue updates
  - [ ] Link to Slack threads

### Phase 3: Knowledge Base
- [ ] Build admin UI for known issues management
- [ ] Seed initial known issues (5-10 common patterns)
- [ ] Implement pattern matching algorithm
- [ ] Build suggestion system for new patterns

### Phase 4: Integration & Testing
- [ ] Configure Grafana webhook
- [ ] Create Grafana alert rules
  - [ ] High error rate (5xx)
  - [ ] Response time degradation
  - [ ] Database connection failures
  - [ ] Memory threshold
- [ ] Create test alerts and validate end-to-end flow
- [ ] Test auto-remediation strategies
- [ ] Test Slack notifications
- [ ] Test GitHub issue creation

### Phase 5: Production & Monitoring
- [ ] Deploy to Railway production
- [ ] Monitor for 1 week
- [ ] Collect metrics on false positive rate
- [ ] Tune validation thresholds if needed
- [ ] Add more known issues based on real alerts
- [ ] Document runbook for the monitoring service itself

### Phase 6: Iteration
- [ ] Review auto-fix success rates
- [ ] Add more remediation strategies based on patterns
- [ ] Improve categorization based on feedback
- [ ] Build dashboard for monitoring metrics

---

## Implementation Timeline Estimate

**Week 1**: Setup, core alert receiver, investigation engine
**Week 2**: Auto-remediation, Slack integration
**Week 3**: GitHub integration, known issues system
**Week 4**: Admin UI, testing, deployment
**Week 5+**: Production monitoring, tuning, iteration
