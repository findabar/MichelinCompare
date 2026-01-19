import { LogEntry } from '../types/logs';
import { DetectedError } from '../types/errors';
import { matchErrorPattern, generateErrorSignature } from '../utils/errorPatterns';
import { groupConsecutiveLogs, extractStackTrace } from '../utils/logParser';

export class ErrorDetector {
  detectErrors(logs: LogEntry[]): DetectedError[] {
    // Filter for error-level logs only
    const errorLogs = logs.filter(
      (log) => log.severity === 'error' || this.isErrorMessage(log.message)
    );

    if (errorLogs.length === 0) {
      return [];
    }

    // Group consecutive errors (within 5 minutes)
    const errorGroups = groupConsecutiveLogs(errorLogs, 5);

    const detectedErrors: DetectedError[] = [];

    for (const group of errorGroups) {
      const error = this.analyzeErrorGroup(group);
      if (error) {
        detectedErrors.push(error);
      }
    }

    return detectedErrors;
  }

  private isErrorMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('error') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('exception') ||
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('crash')
    );
  }

  private analyzeErrorGroup(group: LogEntry[]): DetectedError | null {
    if (group.length === 0) return null;

    const firstLog = group[0];
    const lastLog = group[group.length - 1];

    // Combine all log messages to analyze
    const combinedMessage = group.map((log) => log.message).join('\n');

    // Try to match against known error patterns
    const matchedPattern = matchErrorPattern(combinedMessage);

    const severity = matchedPattern?.severity || 'medium';
    const category = matchedPattern?.category || 'general';

    // Extract main error message (first error line)
    const errorMessage = this.extractMainErrorMessage(group);

    // Generate unique signature for this error
    const signature = generateErrorSignature(errorMessage, category);

    // Extract stack trace if present
    const allLogs = group.map((log) => log.rawLog);
    const stackTrace = extractStackTrace(allLogs);

    return {
      signature,
      serviceName: firstLog.serviceName,
      errorMessage,
      severity,
      category,
      logs: stackTrace.length > 0 ? stackTrace : allLogs.slice(0, 10), // Limit to 10 lines
      firstSeen: firstLog.timestamp,
      lastSeen: lastLog.timestamp,
      occurrenceCount: group.length,
      deploymentId: firstLog.deploymentId,
    };
  }

  private extractMainErrorMessage(group: LogEntry[]): string {
    // Try to find the most descriptive error message
    for (const log of group) {
      const message = log.message;

      // Look for "Error:" prefix
      const errorMatch = message.match(/Error:\s*(.+)/i);
      if (errorMatch) {
        return errorMatch[1].trim().substring(0, 200);
      }

      // Look for exception types
      const exceptionMatch = message.match(/(\w+Exception|Error):\s*(.+)/);
      if (exceptionMatch) {
        return exceptionMatch[2].trim().substring(0, 200);
      }
    }

    // Fallback: use first log message
    return group[0].message.substring(0, 200);
  }

  groupErrorsBySignature(errors: DetectedError[]): Map<string, DetectedError[]> {
    const grouped = new Map<string, DetectedError[]>();

    for (const error of errors) {
      const existing = grouped.get(error.signature) || [];
      existing.push(error);
      grouped.set(error.signature, existing);
    }

    return grouped;
  }

  mergeErrorOccurrences(errors: DetectedError[]): DetectedError {
    if (errors.length === 1) {
      return errors[0];
    }

    // Merge multiple occurrences of the same error
    const first = errors[0];
    const totalOccurrences = errors.reduce((sum, err) => sum + err.occurrenceCount, 0);
    const allLogs = errors.flatMap((err) => err.logs).slice(0, 20); // Limit total logs

    return {
      ...first,
      occurrenceCount: totalOccurrences,
      lastSeen: errors[errors.length - 1].lastSeen,
      logs: allLogs,
    };
  }
}
