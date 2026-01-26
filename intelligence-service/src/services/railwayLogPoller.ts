import { GraphQLClient, gql } from 'graphql-request';
import { LogEntry } from '../types/logs';
import { parseRailwayLog } from '../utils/logParser';

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

interface RailwayConfig {
  apiToken: string;
  projectId: string;
  environmentId: string;
  services: {
    backend: string;
    frontend: string;
    scraper: string;
  };
}

export class RailwayLogPoller {
  private client: GraphQLClient;
  private config: RailwayConfig;

  constructor(config: RailwayConfig) {
    this.config = config;
    this.client = new GraphQLClient(RAILWAY_API_URL, {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
    });
  }

  async fetchLogsForService(
    serviceId: string,
    serviceName: string,
    sinceTime: Date
  ): Promise<LogEntry[]> {
    try {
      const query = gql`
        query GetDeploymentLogs($projectId: String!, $environmentId: String!, $serviceId: String!) {
          deployments(
            input: {
              projectId: $projectId
              environmentId: $environmentId
              serviceId: $serviceId
            }
          ) {
            edges {
              node {
                id
                status
                createdAt
                staticUrl
              }
            }
          }
        }
      `;

      const variables = {
        projectId: this.config.projectId,
        environmentId: this.config.environmentId,
        serviceId,
      };

      const data = await this.client.request<any>(query, variables);
      const deployments = data?.deployments?.edges || [];

      if (deployments.length === 0) {
        console.log(`No deployments found for service: ${serviceName}`);
        return [];
      }

      // Get the most recent deployment
      const latestDeployment = deployments[0].node;
      const deploymentId = latestDeployment.id;

      // Fetch logs for this deployment
      const logs = await this.fetchDeploymentLogs(deploymentId, serviceName, sinceTime);
      return logs;
    } catch (error) {
      console.error(`Failed to fetch logs for service ${serviceName}:`, error);
      return [];
    }
  }

  private async fetchDeploymentLogs(
    deploymentId: string,
    serviceName: string,
    sinceTime: Date
  ): Promise<LogEntry[]> {
    try {
      const query = gql`
        query GetLogs($deploymentId: String!, $limit: Int, $filter: String) {
          deploymentLogs(deploymentId: $deploymentId, limit: $limit, filter: $filter) {
            timestamp
            message
            severity
          }
        }
      `;

      // Filter for logs after the since time
      const variables = {
        deploymentId,
        limit: 1000,
        filter: '@level:error OR @level:warn',
      };

      const data = await this.client.request<any>(query, variables);
      const logArray = data?.deploymentLogs || [];

      const logs: LogEntry[] = [];

      for (const logItem of logArray) {
        const logTimestamp = new Date(logItem.timestamp);

        // Only include logs after sinceTime
        if (logTimestamp >= sinceTime) {
          const parsed = parseRailwayLog(logItem.message, serviceName, deploymentId);
          if (parsed) {
            logs.push({
              ...parsed,
              timestamp: logTimestamp,
              severity: logItem.severity || parsed.severity,
            });
          }
        }
      }

      return logs;
    } catch (error) {
      console.error(`Failed to fetch deployment logs for ${deploymentId}:`, error);
      return [];
    }
  }

  async fetchAllServiceLogs(sinceTime: Date): Promise<Map<string, LogEntry[]>> {
    const results = new Map<string, LogEntry[]>();

    // Fetch logs for all services in parallel
    const [backendLogs, frontendLogs, scraperLogs] = await Promise.all([
      this.fetchLogsForService(this.config.services.backend, 'backend', sinceTime),
      this.fetchLogsForService(this.config.services.frontend, 'frontend', sinceTime),
      this.fetchLogsForService(this.config.services.scraper, 'scraper', sinceTime),
    ]);

    results.set('backend', backendLogs);
    results.set('frontend', frontendLogs);
    results.set('scraper', scraperLogs);

    return results;
  }

  async getLatestDeploymentId(serviceId: string): Promise<string | null> {
    try {
      const query = gql`
        query GetDeployments($projectId: String!, $environmentId: String!, $serviceId: String!) {
          deployments(
            input: {
              projectId: $projectId
              environmentId: $environmentId
              serviceId: $serviceId
            }
          ) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      const variables = {
        projectId: this.config.projectId,
        environmentId: this.config.environmentId,
        serviceId,
      };

      const data = await this.client.request<any>(query, variables);
      const deployments = data?.deployments?.edges || [];

      return deployments.length > 0 ? deployments[0].node.id : null;
    } catch (error) {
      console.error('Failed to get latest deployment ID:', error);
      return null;
    }
  }
}
