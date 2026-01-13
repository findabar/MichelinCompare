import { IssueCategorization, LogAnalysis, HealthCheck, KnownIssue } from '../types';
import logger from '../utils/logger';

export class CategorizationService {
  categorize(params: {
    logAnalysis: LogAnalysis;
    healthCheck: HealthCheck;
    knownIssue?: KnownIssue;
  }): IssueCategorization {
    const { logAnalysis, healthCheck, knownIssue } = params;

    logger.info('Categorizing issue');

    // Start with known issue category if available
    if (knownIssue) {
      return {
        severity: knownIssue.severity as any,
        type: knownIssue.category as any,
        component: knownIssue.component as any,
        labels: [knownIssue.severity, knownIssue.category, knownIssue.component],
      };
    }

    // Determine severity
    const severity = this.determineSeverity(logAnalysis, healthCheck);

    // Determine type
    const type = this.determineType(logAnalysis);

    // Determine component
    const component = this.determineComponent(logAnalysis);

    const labels = [severity, type, component];

    logger.info('Categorization complete', { severity, type, component });

    return {
      severity,
      type,
      component,
      labels,
    };
  }

  private determineSeverity(
    logAnalysis: LogAnalysis,
    healthCheck: HealthCheck
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: API down or database disconnected
    if (!healthCheck.apiResponsive || !healthCheck.databaseConnected) {
      return 'critical';
    }

    // Critical: Very high error rate (>50 errors)
    if (logAnalysis.frequency > 50) {
      return 'critical';
    }

    // High: Significant error rate (>10) or very slow response
    if (logAnalysis.frequency > 10 || healthCheck.responseTime > 5000) {
      return 'high';
    }

    // Medium: Moderate error rate or slow response
    if (logAnalysis.frequency > 3 || healthCheck.responseTime > 3000) {
      return 'medium';
    }

    // Low: Few errors
    return 'low';
  }

  private determineType(
    logAnalysis: LogAnalysis
  ): 'bug' | 'performance' | 'security' | 'infrastructure' | 'database' {
    const errorText = logAnalysis.errorMessages.join(' ').toLowerCase();

    // Database
    if (
      errorText.includes('sql') ||
      errorText.includes('prisma') ||
      errorText.includes('database') ||
      errorText.includes('connection pool')
    ) {
      return 'database';
    }

    // Performance
    if (
      errorText.includes('timeout') ||
      errorText.includes('slow') ||
      errorText.includes('performance') ||
      errorText.includes('memory')
    ) {
      return 'performance';
    }

    // Security
    if (
      errorText.includes('auth') ||
      errorText.includes('token') ||
      errorText.includes('unauthorized') ||
      errorText.includes('forbidden')
    ) {
      return 'security';
    }

    // Infrastructure
    if (
      errorText.includes('redis') ||
      errorText.includes('connection refused') ||
      errorText.includes('network')
    ) {
      return 'infrastructure';
    }

    // Default to bug
    return 'bug';
  }

  private determineComponent(
    logAnalysis: LogAnalysis
  ): 'backend-api' | 'frontend' | 'scraper' | 'authentication' | 'database' {
    const errorText = logAnalysis.errorMessages.join(' ').toLowerCase();
    const endpoints = logAnalysis.affectedEndpoints.join(' ').toLowerCase();

    // Authentication
    if (
      errorText.includes('auth') ||
      errorText.includes('token') ||
      endpoints.includes('/auth')
    ) {
      return 'authentication';
    }

    // Database
    if (errorText.includes('prisma') || errorText.includes('database')) {
      return 'database';
    }

    // Scraper
    if (
      errorText.includes('scraper') ||
      errorText.includes('puppeteer') ||
      errorText.includes('michelin')
    ) {
      return 'scraper';
    }

    // Frontend
    if (errorText.includes('react') || errorText.includes('vite')) {
      return 'frontend';
    }

    // Default to backend API
    return 'backend-api';
  }
}
