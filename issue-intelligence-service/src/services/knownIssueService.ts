import { PrismaClient } from '@prisma/client';
import { LogAnalysis, KnownIssue } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class KnownIssueService {
  async matchKnownIssue(logAnalysis: LogAnalysis): Promise<KnownIssue | null> {
    logger.info('Matching against known issues');

    const knownIssues = await prisma.knownIssue.findMany();

    for (const issue of knownIssues) {
      if (this.matchesPattern(logAnalysis, issue.errorPattern)) {
        logger.info('Matched known issue', { issueId: issue.id, title: issue.title });

        // Update occurrence count and last seen
        await prisma.knownIssue.update({
          where: { id: issue.id },
          data: {
            occurrences: { increment: 1 },
            lastSeen: new Date(),
          },
        });

        return {
          id: issue.id,
          errorPattern: issue.errorPattern,
          title: issue.title,
          description: issue.description,
          solution: issue.solution,
          autoRemediable: issue.autoRemediable,
          remediationScript: issue.remediationScript || undefined,
          category: issue.category,
          component: issue.component,
          occurrences: issue.occurrences + 1,
          lastSeen: new Date(),
        };
      }
    }

    logger.info('No known issue matched');
    return null;
  }

  private matchesPattern(logAnalysis: LogAnalysis, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');

      // Check against error messages
      for (const error of logAnalysis.errorMessages) {
        if (regex.test(error)) {
          return true;
        }
      }

      // Check against error pattern
      if (logAnalysis.errorPattern && regex.test(logAnalysis.errorPattern)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Invalid regex pattern', { pattern, error });
      return false;
    }
  }

  async seedKnownIssues() {
    logger.info('Seeding known issues');

    const issues = [
      {
        title: 'Database Connection Pool Exhausted',
        errorPattern: '.*(connection pool|too many clients).*',
        description: 'Prisma connection pool has been exhausted due to too many concurrent connections',
        solution: 'Restart service to reset connection pool. Consider increasing connection pool size in Prisma configuration.',
        autoRemediable: true,
        remediationScript: 'restart',
        category: 'database',
        component: 'backend-api',
        severity: 'critical',
        createdBy: 'system',
      },
      {
        title: 'Redis Connection Lost',
        errorPattern: '.*ECONNREFUSED.*redis.*',
        description: 'Unable to connect to Redis cache service',
        solution: 'Check Redis service status in Railway. May need to restart Redis or update connection string.',
        autoRemediable: true,
        remediationScript: 'reconnect-redis',
        category: 'infrastructure',
        component: 'backend-api',
        severity: 'high',
        createdBy: 'system',
      },
      {
        title: 'Memory Leak - High Memory Usage',
        errorPattern: '.*heap out of memory.*|.*JavaScript heap.*',
        description: 'Node.js process has exhausted available memory',
        solution: 'Restart service immediately. Investigate memory leak in application code.',
        autoRemediable: true,
        remediationScript: 'restart',
        category: 'performance',
        component: 'backend-api',
        severity: 'critical',
        createdBy: 'system',
      },
      {
        title: 'JWT Token Expired',
        errorPattern: '.*jwt expired.*|.*token.*expired.*',
        description: 'User authentication token has expired',
        solution: 'Not a service issue - users need to re-authenticate. Monitor frequency to ensure token expiry time is appropriate.',
        autoRemediable: false,
        category: 'authentication',
        component: 'backend-api',
        severity: 'low',
        createdBy: 'system',
      },
      {
        title: 'External API Timeout',
        errorPattern: '.*(geocoding|external).*timeout.*',
        description: 'External API service (e.g., geocoding) is timing out',
        solution: 'External service issue. Implement retry logic with exponential backoff. Consider caching results.',
        autoRemediable: false,
        category: 'infrastructure',
        component: 'backend-api',
        severity: 'medium',
        createdBy: 'system',
      },
    ];

    for (const issue of issues) {
      await prisma.knownIssue.upsert({
        where: { title: issue.title },
        update: {},
        create: issue,
      });
    }

    logger.info(`Seeded ${issues.length} known issues`);
  }
}
