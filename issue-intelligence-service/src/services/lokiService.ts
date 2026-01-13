import axios from 'axios';
import { config } from '../config';
import { LogAnalysis, AlertContext } from '../types';
import logger from '../utils/logger';

export class LokiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.loki.url || '';
  }

  async queryLogs(query: string, start: Date, end: Date): Promise<any> {
    try {
      const startNs = Math.floor(start.getTime() * 1000000);
      const endNs = Math.floor(end.getTime() * 1000000);

      const response = await axios.get(`${this.baseUrl}/loki/api/v1/query_range`, {
        params: {
          query,
          start: startNs,
          end: endNs,
          limit: 1000,
        },
        timeout: config.loki.queryTimeout,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to query Loki', { error, query });
      throw error;
    }
  }

  async analyzeLogs(context: AlertContext): Promise<LogAnalysis> {
    logger.info('Analyzing logs from Loki', { alertName: context.alertName });

    const now = new Date();
    const start = new Date(context.timestamp.getTime() - 15 * 60 * 1000); // 15 min before
    const end = new Date(context.timestamp.getTime() + 15 * 60 * 1000); // 15 min after

    const logsData = await this.queryLogs(context.logQuery, start, end);

    const errorMessages: string[] = [];
    const stackTraces: string[] = [];
    const affectedEndpoints: string[] = [];

    // Parse log entries
    if (logsData.data?.result) {
      for (const stream of logsData.data.result) {
        for (const [timestamp, message] of stream.values) {
          if (message.toLowerCase().includes('error')) {
            errorMessages.push(message);
          }
          if (message.includes('at ') && message.includes('.js:')) {
            stackTraces.push(message);
          }
          // Extract endpoint from message
          const endpointMatch = message.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]*)/);
          if (endpointMatch && !affectedEndpoints.includes(endpointMatch[1])) {
            affectedEndpoints.push(endpointMatch[1]);
          }
        }
      }
    }

    // Deduplicate and get unique error pattern
    const uniqueErrors = [...new Set(errorMessages)];
    const errorPattern = this.extractErrorPattern(uniqueErrors);

    return {
      errorMessages: uniqueErrors.slice(0, 10), // Top 10
      stackTraces: stackTraces.slice(0, 5), // Top 5
      affectedEndpoints: [...new Set(affectedEndpoints)],
      errorPattern,
      firstOccurrence: start,
      lastOccurrence: end,
      frequency: errorMessages.length,
    };
  }

  private extractErrorPattern(errors: string[]): string | undefined {
    if (errors.length === 0) return undefined;

    // Find common error pattern
    // Simple approach: return the most common error prefix
    const firstError = errors[0];
    const colonIndex = firstError.indexOf(':');
    if (colonIndex > 0) {
      return firstError.substring(0, colonIndex).trim();
    }

    return firstError.substring(0, 100);
  }
}
