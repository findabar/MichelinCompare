import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3003,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  grafana: {
    url: process.env.GRAFANA_URL,
    apiKey: process.env.GRAFANA_API_KEY,
  },

  loki: {
    url: process.env.LOKI_URL,
    queryTimeout: 30000,
  },

  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || 'findabar',
    repo: process.env.GITHUB_REPO || 'MichellinCompare',
    defaultLabels: ['automated-alert', 'needs-triage'],
  },

  slack: {
    // Optional - configure later
    token: process.env.SLACK_BOT_TOKEN,
    channels: {
      critical: process.env.SLACK_CHANNEL_CRITICAL,
      high: process.env.SLACK_CHANNEL_HIGH,
      medium: process.env.SLACK_CHANNEL_MEDIUM,
      resolved: process.env.SLACK_CHANNEL_RESOLVED,
    },
  },

  railway: {
    apiToken: process.env.RAILWAY_API_TOKEN,
    projectId: process.env.RAILWAY_PROJECT_ID,
    services: {
      backend: process.env.RAILWAY_BACKEND_SERVICE_ID,
      frontend: process.env.RAILWAY_FRONTEND_SERVICE_ID,
      scraper: process.env.RAILWAY_SCRAPER_SERVICE_ID,
    },
  },

  application: {
    healthEndpoint: process.env.APP_HEALTH_URL || 'http://localhost:3001/health',
    apiUrl: process.env.APP_API_URL || 'http://localhost:3001/api',
  },

  validation: {
    // LOW THRESHOLD - Favor catching issues over false negatives
    minErrorCount: 3,
    minConfidence: 60,
    healthCheckTimeout: 10000,
    createIssueOnSingleErrorWithStackTrace: true,
    deduplicationWindow: 3600000, // 1 hour in ms
  },

  remediation: {
    enabled: true,
    maxAttempts: 1, // Only try once per alert
    strategies: {
      restart: {
        enabled: true,
        waitForHealthCheck: 30000, // 30s
        healthCheckRetries: 3,
      },
      cacheReset: {
        enabled: true,
        waitTime: 5000, // 5s
      },
      dbReconnect: {
        enabled: true,
        timeout: 10000, // 10s
      },
    },
  },

  issueCreation: {
    maxIssuesPerHour: 10,
    autoCloseAfterHours: 24,
    componentTeams: {
      'backend-api': ['@backend-team'],
      'frontend': ['@frontend-team'],
      'scraper': ['@data-team'],
    },
  },
};
