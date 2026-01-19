import { LogEntry } from '../types/logs';

export function parseRailwayLog(
  logLine: string,
  serviceName: string,
  deploymentId?: string
): LogEntry | null {
  try {
    // Railway logs are typically in format: [timestamp] message
    // or just plain message
    const timestampMatch = logLine.match(/^\[([^\]]+)\]\s*(.+)$/);

    let timestamp: Date;
    let message: string;

    if (timestampMatch) {
      timestamp = new Date(timestampMatch[1]);
      message = timestampMatch[2];
    } else {
      timestamp = new Date();
      message = logLine;
    }

    // Determine severity based on content
    let severity = 'info';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('exception')) {
      severity = 'error';
    } else if (lowerMessage.includes('warn')) {
      severity = 'warn';
    }

    return {
      timestamp,
      message,
      severity,
      serviceName,
      deploymentId,
      rawLog: logLine,
    };
  } catch (error) {
    console.error('Failed to parse log line:', error);
    return null;
  }
}

export function extractStackTrace(logs: string[]): string[] {
  const stackTraceLines: string[] = [];
  let inStackTrace = false;

  for (const log of logs) {
    // Start of stack trace
    if (log.match(/^\s*at\s+/i) || log.match(/Error:/i)) {
      inStackTrace = true;
      stackTraceLines.push(log);
    } else if (inStackTrace) {
      // Continue stack trace if line starts with whitespace or "at"
      if (log.match(/^\s+/) || log.match(/^\s*at\s+/)) {
        stackTraceLines.push(log);
      } else {
        inStackTrace = false;
      }
    }
  }

  return stackTraceLines;
}

export function groupConsecutiveLogs(logs: LogEntry[], maxGapMinutes = 5): LogEntry[][] {
  if (logs.length === 0) return [];

  const groups: LogEntry[][] = [];
  let currentGroup: LogEntry[] = [logs[0]];

  for (let i = 1; i < logs.length; i++) {
    const timeDiff = logs[i].timestamp.getTime() - logs[i - 1].timestamp.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff <= maxGapMinutes) {
      currentGroup.push(logs[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [logs[i]];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
