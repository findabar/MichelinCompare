import {
  AlertContext,
  LogAnalysis,
  HealthCheck,
  HistoricalContext,
  KnownIssue,
  ValidationResult,
} from '../types';
import { config } from '../config';
import logger from '../utils/logger';

export class ValidationService {
  validate(params: {
    context: AlertContext;
    logAnalysis: LogAnalysis;
    healthCheck: HealthCheck;
    historical: HistoricalContext;
    knownIssue: KnownIssue | null;
  }): ValidationResult {
    const { context, logAnalysis, healthCheck, historical, knownIssue } = params;

    logger.info('Validating issue', { alertName: context.alertName });

    let isRealIssue = false;
    let confidence = 0;
    let reason = '';
    let shouldAttemptRemediation = false;

    // Rule 1: Any error with health check failures
    if (!healthCheck.apiResponsive || !healthCheck.databaseConnected) {
      isRealIssue = true;
      confidence = 95;
      reason = 'Health check failures detected';
    }

    // Rule 2: Sustained errors (>3 occurrences in time window)
    else if (logAnalysis.frequency >= config.validation.minErrorCount) {
      isRealIssue = true;
      confidence = 85;
      reason = `Sustained errors: ${logAnalysis.frequency} occurrences`;
    }

    // Rule 3: Critical errors with stack traces
    else if (logAnalysis.stackTraces.length > 0 && context.severity === 'critical') {
      isRealIssue = true;
      confidence = 80;
      reason = 'Critical error with stack trace';
    }

    // Rule 4: Performance degradation (>2x baseline)
    else if (healthCheck.responseTime > 3000) {
      isRealIssue = true;
      confidence = 70;
      reason = `High response time: ${healthCheck.responseTime}ms`;
    }

    // Rule 5: Single occurrence with stack trace (low threshold)
    else if (
      logAnalysis.stackTraces.length > 0 &&
      config.validation.createIssueOnSingleErrorWithStackTrace
    ) {
      isRealIssue = true;
      confidence = 65;
      reason = 'Single error with stack trace';
    }

    // Rule 6: Known false positive - JWT expired
    else if (knownIssue && !knownIssue.autoRemediable && knownIssue.title.includes('JWT')) {
      isRealIssue = false;
      confidence = 90;
      reason = 'Known false positive: JWT token expiry';
    }

    // Default: Not enough evidence
    else {
      isRealIssue = false;
      confidence = 50;
      reason = 'Insufficient evidence for real issue';
    }

    // Determine if we should attempt remediation
    if (knownIssue && knownIssue.autoRemediable && isRealIssue) {
      shouldAttemptRemediation = true;
    }

    // Determine if we should create issue
    const shouldCreateIssue = isRealIssue && confidence >= config.validation.minConfidence;

    // Check for existing open issue
    let shouldUpdateExisting: number | undefined;
    if (historical.openGitHubIssue) {
      shouldUpdateExisting = historical.openGitHubIssue;
    }

    logger.info('Validation complete', {
      isRealIssue,
      confidence,
      reason,
      shouldCreateIssue,
      shouldAttemptRemediation,
    });

    return {
      isRealIssue,
      confidence,
      reason,
      shouldCreateIssue,
      shouldUpdateExisting,
      knownIssue: knownIssue || undefined,
      shouldAttemptRemediation,
    };
  }
}
