import { PrismaClient } from '@prisma/client';
import { HistoricalContext, AlertContext } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class HistoricalService {
  async checkHistoricalData(alert: AlertContext): Promise<HistoricalContext> {
    logger.info('Checking historical data', { alertName: alert.alertName });

    // Find previous occurrences of this alert
    const previousAlerts = await prisma.alertEvent.findMany({
      where: {
        alertName: alert.alertName,
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: 10,
    });

    const totalOccurrences = previousAlerts.length;
    const isRecurring = totalOccurrences > 1;

    let lastOccurrence: Date | undefined;
    let openGitHubIssue: number | undefined;
    let meanTimeBetweenOccurrences: number | undefined;

    if (totalOccurrences > 0) {
      lastOccurrence = previousAlerts[0].receivedAt;

      // Check for open GitHub issue
      const alertWithIssue = previousAlerts.find(
        a => a.githubIssueNumber && !a.createdIssueAt
      );
      if (alertWithIssue) {
        openGitHubIssue = alertWithIssue.githubIssueNumber || undefined;
      }

      // Calculate mean time between occurrences
      if (totalOccurrences > 1) {
        const times = previousAlerts.map(a => a.receivedAt.getTime());
        const diffs: number[] = [];
        for (let i = 0; i < times.length - 1; i++) {
          diffs.push(times[i] - times[i + 1]);
        }
        meanTimeBetweenOccurrences = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      }
    }

    logger.info('Historical analysis complete', {
      isRecurring,
      totalOccurrences,
      openGitHubIssue,
    });

    return {
      isRecurring,
      lastOccurrence,
      openGitHubIssue,
      totalOccurrences,
      meanTimeBetweenOccurrences,
    };
  }
}
