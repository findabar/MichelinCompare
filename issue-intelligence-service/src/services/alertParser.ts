import { GrafanaAlert, AlertContext } from '../types';
import logger from '../utils/logger';

export function parseGrafanaAlert(payload: GrafanaAlert): AlertContext {
  logger.debug('Parsing Grafana alert', { payload });

  const firstAlert = payload.alerts[0];
  if (!firstAlert) {
    throw new Error('No alerts found in payload');
  }

  const severity = getSeverityFromLabels(firstAlert.labels);
  const affectedService = firstAlert.labels.service || firstAlert.labels.job || 'unknown';
  const alertName = firstAlert.labels.alertname || 'Unknown Alert';

  return {
    timestamp: new Date(firstAlert.startsAt),
    alertName,
    severity,
    affectedService,
    logQuery: generateLogQuery(firstAlert),
    metrics: {
      errorCount: parseInt(firstAlert.annotations.error_count || '0', 10),
      timeWindow: firstAlert.annotations.time_window || '5m',
      affectedEndpoints: parseAffectedEndpoints(firstAlert.annotations),
    },
  };
}

function getSeverityFromLabels(labels: Record<string, string>): 'critical' | 'warning' | 'info' {
  const severity = labels.severity?.toLowerCase();
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function generateLogQuery(alert: any): string {
  const service = alert.labels.service || alert.labels.job;
  const timeWindow = alert.annotations.time_window || '15m';

  return `{service="${service}"} |= "error" | json | __error__="" [${timeWindow}]`;
}

function parseAffectedEndpoints(annotations: Record<string, string>): string[] | undefined {
  const endpoints = annotations.affected_endpoints;
  if (!endpoints) return undefined;

  return endpoints.split(',').map(e => e.trim());
}
