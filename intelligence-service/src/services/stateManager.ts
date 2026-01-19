import { PrismaClient } from '@prisma/client';
import { DetectedError } from '../types/errors';

export class StateManager {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getLastCheckTime(serviceName: string): Promise<Date> {
    try {
      const checkpoint = await this.prisma.logCheckpoint.findUnique({
        where: { serviceName },
      });

      if (checkpoint) {
        return checkpoint.lastCheckTime;
      }

      // Default to 15 minutes ago for first run
      const defaultTime = new Date();
      defaultTime.setMinutes(defaultTime.getMinutes() - 15);
      return defaultTime;
    } catch (error) {
      console.error(`Failed to get last check time for ${serviceName}:`, error);
      // Fallback to 15 minutes ago
      const fallbackTime = new Date();
      fallbackTime.setMinutes(fallbackTime.getMinutes() - 15);
      return fallbackTime;
    }
  }

  async updateLastCheckTime(serviceName: string, checkTime: Date): Promise<void> {
    try {
      await this.prisma.logCheckpoint.upsert({
        where: { serviceName },
        update: { lastCheckTime: checkTime },
        create: {
          serviceName,
          lastCheckTime: checkTime,
        },
      });
    } catch (error) {
      console.error(`Failed to update last check time for ${serviceName}:`, error);
    }
  }

  async findExistingIssue(errorSignature: string): Promise<{
    id: string;
    githubIssueNumber: number;
    occurrenceCount: number;
  } | null> {
    try {
      const issue = await this.prisma.detectedIssue.findUnique({
        where: { errorSignature },
        select: {
          id: true,
          githubIssueNumber: true,
          occurrenceCount: true,
        },
      });

      return issue;
    } catch (error) {
      console.error('Failed to find existing issue:', error);
      return null;
    }
  }

  async createIssue(error: DetectedError, githubIssueNumber: number): Promise<void> {
    try {
      await this.prisma.detectedIssue.create({
        data: {
          githubIssueNumber,
          errorSignature: error.signature,
          serviceName: error.serviceName,
          errorMessage: error.errorMessage,
          firstSeen: error.firstSeen,
          lastSeen: error.lastSeen,
          occurrenceCount: error.occurrenceCount,
        },
      });
    } catch (error) {
      console.error('Failed to create issue in database:', error);
    }
  }

  async updateIssueOccurrence(
    errorSignature: string,
    additionalOccurrences: number,
    lastSeen: Date
  ): Promise<void> {
    try {
      await this.prisma.detectedIssue.update({
        where: { errorSignature },
        data: {
          occurrenceCount: {
            increment: additionalOccurrences,
          },
          lastSeen,
        },
      });
    } catch (error) {
      console.error('Failed to update issue occurrence:', error);
    }
  }

  async markIssueAsAnalyzed(githubIssueNumber: number): Promise<void> {
    try {
      await this.prisma.detectedIssue.update({
        where: { githubIssueNumber },
        data: { claudeAnalyzed: true },
      });
    } catch (error) {
      console.error('Failed to mark issue as analyzed:', error);
    }
  }

  async markIssueAsResolved(githubIssueNumber: number): Promise<void> {
    try {
      await this.prisma.detectedIssue.update({
        where: { githubIssueNumber },
        data: { resolved: true },
      });
    } catch (error) {
      console.error('Failed to mark issue as resolved:', error);
    }
  }

  async getUnanalyzedIssues(): Promise<
    Array<{
      githubIssueNumber: number;
      errorSignature: string;
      serviceName: string;
    }>
  > {
    try {
      const issues = await this.prisma.detectedIssue.findMany({
        where: {
          claudeAnalyzed: false,
          resolved: false,
        },
        select: {
          githubIssueNumber: true,
          errorSignature: true,
          serviceName: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return issues;
    } catch (error) {
      console.error('Failed to get unanalyzed issues:', error);
      return [];
    }
  }

  async getStats(): Promise<{
    totalIssues: number;
    analyzedIssues: number;
    unresolvedIssues: number;
    byService: Record<string, number>;
  }> {
    try {
      const [totalIssues, analyzedIssues, unresolvedIssues, byService] = await Promise.all([
        this.prisma.detectedIssue.count(),
        this.prisma.detectedIssue.count({ where: { claudeAnalyzed: true } }),
        this.prisma.detectedIssue.count({ where: { resolved: false } }),
        this.prisma.detectedIssue.groupBy({
          by: ['serviceName'],
          _count: true,
        }),
      ]);

      const serviceStats: Record<string, number> = {};
      for (const item of byService) {
        serviceStats[item.serviceName] = item._count;
      }

      return {
        totalIssues,
        analyzedIssues,
        unresolvedIssues,
        byService: serviceStats,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalIssues: 0,
        analyzedIssues: 0,
        unresolvedIssues: 0,
        byService: {},
      };
    }
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
