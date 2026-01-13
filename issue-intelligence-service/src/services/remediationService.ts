import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { RemediationResult, KnownIssue, AlertContext } from '../types';
import logger from '../utils/logger';
import { HealthCheckService } from './healthCheckService';

const prisma = new PrismaClient();

export class RemediationService {
  private healthCheckService: HealthCheckService;

  constructor() {
    this.healthCheckService = new HealthCheckService();
  }

  async attemptRemediation(params: {
    alert: AlertContext;
    knownIssue: KnownIssue;
    alertEventId: string;
  }): Promise<RemediationResult> {
    const { alert, knownIssue, alertEventId } = params;

    if (!config.remediation.enabled) {
      logger.info('Remediation is disabled');
      return {
        attempted: false,
        success: false,
        action: 'none',
        logs: ['Remediation is disabled in config'],
        shouldCreateIssue: true,
      };
    }

    logger.info('Attempting remediation', {
      knownIssue: knownIssue.title,
      strategy: knownIssue.remediationScript,
    });

    const logs: string[] = [];
    let success = false;
    let strategy = knownIssue.remediationScript || 'unknown';
    let errorMessage: string | undefined;

    try {
      switch (strategy) {
        case 'restart':
          ({ success, logs: logs } = await this.restartService(alert.affectedService, logs));
          break;

        case 'reconnect-redis':
          ({ success, logs: logs } = await this.reconnectRedis(logs));
          break;

        case 'reconnect-db':
          ({ success, logs: logs } = await this.reconnectDatabase(logs));
          break;

        case 'cache-clear':
          ({ success, logs: logs } = await this.clearCache(logs));
          break;

        default:
          logs.push(`Unknown remediation strategy: ${strategy}`);
          success = false;
      }

      // Update known issue success metrics
      await prisma.knownIssue.update({
        where: { id: knownIssue.id },
        data: success
          ? { autoFixSuccessCount: { increment: 1 } }
          : { autoFixFailCount: { increment: 1 } },
      });
    } catch (error: any) {
      logger.error('Remediation failed with exception', { error, strategy });
      errorMessage = error.message;
      logs.push(`Exception: ${error.message}`);
      success = false;
    }

    // Save remediation attempt
    await prisma.remediationAttempt.create({
      data: {
        alertEventId,
        knownIssueId: knownIssue.id,
        strategy,
        success,
        errorMessage,
        logs: logs,
      },
    });

    return {
      attempted: true,
      success,
      action: strategy,
      logs,
      shouldCreateIssue: !success,
    };
  }

  private async restartService(
    serviceName: string,
    logs: string[]
  ): Promise<{ success: boolean; logs: string[] }> {
    logs.push(`Attempting to restart service: ${serviceName}`);

    // Get service ID from config
    const serviceId = this.getServiceId(serviceName);
    if (!serviceId) {
      logs.push(`Service ID not found for: ${serviceName}`);
      return { success: false, logs };
    }

    try {
      // Call Railway API to restart service
      const response = await axios.post(
        'https://backboard.railway.app/graphql',
        {
          query: `
            mutation serviceInstanceRedeploy($serviceId: String!) {
              serviceInstanceRedeploy(serviceId: $serviceId)
            }
          `,
          variables: { serviceId },
        },
        {
          headers: {
            Authorization: `Bearer ${config.railway.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.errors) {
        logs.push(`Railway API error: ${JSON.stringify(response.data.errors)}`);
        return { success: false, logs };
      }

      logs.push('Service restart initiated successfully');

      // Wait for service to come back up
      logs.push(`Waiting ${config.remediation.strategies.restart.waitForHealthCheck}ms for health check...`);
      await this.sleep(config.remediation.strategies.restart.waitForHealthCheck);

      // Perform health check
      const healthCheck = await this.healthCheckService.performHealthChecks(serviceName);

      if (healthCheck.apiResponsive) {
        logs.push('✓ Health check passed - service is responsive');
        return { success: true, logs };
      } else {
        logs.push('✗ Health check failed - service still unresponsive');
        return { success: false, logs };
      }
    } catch (error: any) {
      logs.push(`Failed to restart service: ${error.message}`);
      return { success: false, logs };
    }
  }

  private async reconnectRedis(logs: string[]): Promise<{ success: boolean; logs: string[] }> {
    logs.push('Redis reconnection not yet implemented');
    // TODO: Implement Redis reconnection logic
    return { success: false, logs };
  }

  private async reconnectDatabase(logs: string[]): Promise<{ success: boolean; logs: string[] }> {
    logs.push('Attempting database reconnection');

    try {
      await prisma.$disconnect();
      logs.push('Disconnected from database');

      await this.sleep(2000);

      await prisma.$connect();
      logs.push('Reconnected to database');

      // Test connection
      await prisma.$queryRaw`SELECT 1`;
      logs.push('✓ Database connection verified');

      return { success: true, logs };
    } catch (error: any) {
      logs.push(`✗ Database reconnection failed: ${error.message}`);
      return { success: false, logs };
    }
  }

  private async clearCache(logs: string[]): Promise<{ success: boolean; logs: string[] }> {
    logs.push('Cache clear not yet implemented');
    // TODO: Implement cache clearing logic
    return { success: false, logs };
  }

  private getServiceId(serviceName: string): string | undefined {
    const normalized = serviceName.toLowerCase();

    if (normalized.includes('backend') || normalized.includes('api')) {
      return config.railway.services.backend;
    }
    if (normalized.includes('frontend')) {
      return config.railway.services.frontend;
    }
    if (normalized.includes('scraper')) {
      return config.railway.services.scraper;
    }

    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
