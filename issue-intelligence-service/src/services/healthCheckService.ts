import axios from 'axios';
import { config } from '../config';
import { HealthCheck } from '../types';
import logger from '../utils/logger';

export class HealthCheckService {
  async performHealthChecks(service?: string): Promise<HealthCheck> {
    logger.info('Performing health checks', { service });

    const [apiResponsive, responseTime] = await this.checkApi();
    const databaseConnected = await this.checkDatabase();

    return {
      apiResponsive,
      databaseConnected,
      responseTime,
      externalServices: {}, // TODO: Add external service checks
    };
  }

  private async checkApi(): Promise<[boolean, number]> {
    const startTime = Date.now();
    try {
      await axios.get(config.application.healthEndpoint, {
        timeout: config.validation.healthCheckTimeout,
      });
      const responseTime = Date.now() - startTime;
      return [true, responseTime];
    } catch (error) {
      logger.error('API health check failed', { error });
      return [false, Date.now() - startTime];
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // TODO: Implement actual database check using Prisma
      // For now, assume it's connected if we can reach the API
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }
}
