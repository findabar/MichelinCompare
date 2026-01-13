export interface AlertContext {
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

export interface LogAnalysis {
  errorMessages: string[];
  stackTraces: string[];
  affectedEndpoints: string[];
  affectedUsers?: number;
  errorPattern?: string;
  firstOccurrence: Date;
  lastOccurrence: Date;
  frequency: number;
}

export interface HealthCheck {
  apiResponsive: boolean;
  databaseConnected: boolean;
  responseTime: number;
  externalServices: Record<string, 'up' | 'down' | 'degraded'>;
}

export interface HistoricalContext {
  isRecurring: boolean;
  lastOccurrence?: Date;
  openGitHubIssue?: number;
  totalOccurrences: number;
  meanTimeBetweenOccurrences?: number;
}

export interface KnownIssue {
  id: string;
  errorPattern: string;
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

export interface ValidationResult {
  isRealIssue: boolean;
  confidence: number;
  reason: string;
  shouldCreateIssue: boolean;
  shouldUpdateExisting?: number;
  knownIssue?: KnownIssue;
  shouldAttemptRemediation: boolean;
}

export interface RemediationResult {
  attempted: boolean;
  success: boolean;
  action: string;
  logs: string[];
  shouldCreateIssue: boolean;
}

export interface IssueCategorization {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'bug' | 'performance' | 'security' | 'infrastructure' | 'database';
  component: 'backend-api' | 'frontend' | 'scraper' | 'authentication' | 'database';
  labels: string[];
  assignTeam?: string;
}

export interface GrafanaAlert {
  receiver: string;
  status: string;
  alerts: Array<{
    status: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt?: string;
    generatorURL: string;
    fingerprint: string;
  }>;
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
  version: string;
  groupKey: string;
  truncatedAlerts?: number;
}
