export interface ErrorPattern {
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface DetectedError {
  signature: string;
  serviceName: string;
  errorMessage: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  logs: string[];
  firstSeen: Date;
  lastSeen: Date;
  occurrenceCount: number;
  deploymentId?: string;
}

export interface ErrorGroup {
  signature: string;
  errors: DetectedError[];
  count: number;
}
