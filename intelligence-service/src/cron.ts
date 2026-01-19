import { RailwayLogPoller } from './services/railwayLogPoller';
import { ErrorDetector } from './services/errorDetector';
import { GitHubIssueCreator } from './services/githubIssueCreator';
import { StateManager } from './services/stateManager';

export class LogMonitorCron {
  private railwayPoller: RailwayLogPoller;
  private errorDetector: ErrorDetector;
  private githubCreator: GitHubIssueCreator;
  private stateManager: StateManager;
  private railwayProjectId: string;

  constructor() {
    // Validate environment variables
    this.validateEnv();

    this.railwayProjectId = process.env.RAILWAY_PROJECT_ID!;

    this.railwayPoller = new RailwayLogPoller({
      apiToken: process.env.RAILWAY_API_TOKEN!,
      projectId: process.env.RAILWAY_PROJECT_ID!,
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
      services: {
        backend: process.env.BACKEND_SERVICE_ID!,
        frontend: process.env.FRONTEND_SERVICE_ID!,
        scraper: process.env.SCRAPER_SERVICE_ID!,
      },
    });

    this.errorDetector = new ErrorDetector();

    this.githubCreator = new GitHubIssueCreator({
      token: process.env.GITHUB_TOKEN!,
      owner: process.env.GITHUB_REPO_OWNER!,
      repo: process.env.GITHUB_REPO_NAME!,
    });

    this.stateManager = new StateManager();
  }

  private validateEnv() {
    const required = [
      'RAILWAY_API_TOKEN',
      'RAILWAY_PROJECT_ID',
      'RAILWAY_ENVIRONMENT_ID',
      'BACKEND_SERVICE_ID',
      'FRONTEND_SERVICE_ID',
      'SCRAPER_SERVICE_ID',
      'GITHUB_TOKEN',
      'GITHUB_REPO_OWNER',
      'GITHUB_REPO_NAME',
      'DATABASE_URL',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async run() {
    try {
      console.log(`[${new Date().toISOString()}] Starting log monitoring check...`);

      // Get last check time for each service
      const services = ['backend', 'frontend', 'scraper'];
      const checkTime = new Date();

      for (const serviceName of services) {
        await this.checkServiceLogs(serviceName, checkTime);
      }

      console.log(`[${new Date().toISOString()}] Log monitoring check completed.`);
    } catch (error) {
      console.error('Error during log monitoring:', error);
    }
  }

  private async checkServiceLogs(serviceName: string, checkTime: Date) {
    try {
      // Get last check time
      const lastCheckTime = await this.stateManager.getLastCheckTime(serviceName);
      console.log(`Checking ${serviceName} logs since ${lastCheckTime.toISOString()}`);

      // Fetch logs from Railway
      const serviceId = this.getServiceId(serviceName);
      const logs = await this.railwayPoller.fetchLogsForService(
        serviceId,
        serviceName,
        lastCheckTime
      );

      if (logs.length === 0) {
        console.log(`No new logs found for ${serviceName}`);
        await this.stateManager.updateLastCheckTime(serviceName, checkTime);
        return;
      }

      console.log(`Found ${logs.length} logs for ${serviceName}`);

      // Detect errors
      const errors = this.errorDetector.detectErrors(logs);

      if (errors.length === 0) {
        console.log(`No errors detected in ${serviceName} logs`);
        await this.stateManager.updateLastCheckTime(serviceName, checkTime);
        return;
      }

      console.log(`Detected ${errors.length} errors in ${serviceName}`);

      // Group errors by signature
      const groupedErrors = this.errorDetector.groupErrorsBySignature(errors);

      // Process each unique error
      for (const [signature, errorList] of groupedErrors.entries()) {
        await this.processError(errorList);
      }

      // Update checkpoint
      await this.stateManager.updateLastCheckTime(serviceName, checkTime);
    } catch (error) {
      console.error(`Failed to check logs for ${serviceName}:`, error);
    }
  }

  private async processError(errors: Array<any>) {
    try {
      // Merge multiple occurrences
      const mergedError = this.errorDetector.mergeErrorOccurrences(errors);

      // Check if we already have an issue for this error
      const existingIssue = await this.stateManager.findExistingIssue(mergedError.signature);

      if (existingIssue) {
        // Update existing issue
        console.log(
          `Error already tracked in issue #${existingIssue.githubIssueNumber}, adding comment`
        );

        await this.githubCreator.createRecurrenceComment(
          existingIssue.githubIssueNumber,
          mergedError.occurrenceCount,
          mergedError.lastSeen
        );

        await this.stateManager.updateIssueOccurrence(
          mergedError.signature,
          mergedError.occurrenceCount,
          mergedError.lastSeen
        );
      } else {
        // Create new GitHub issue
        console.log(`Creating new issue for error: ${mergedError.errorMessage.substring(0, 60)}`);

        const issue = await this.githubCreator.createIssue(mergedError, this.railwayProjectId);

        if (issue) {
          console.log(`Created issue #${issue.number}: ${issue.html_url}`);

          // Save to database
          await this.stateManager.createIssue(mergedError, issue.number);
        } else {
          console.error('Failed to create GitHub issue');
        }
      }
    } catch (error) {
      console.error('Failed to process error:', error);
    }
  }

  private getServiceId(serviceName: string): string {
    switch (serviceName) {
      case 'backend':
        return process.env.BACKEND_SERVICE_ID!;
      case 'frontend':
        return process.env.FRONTEND_SERVICE_ID!;
      case 'scraper':
        return process.env.SCRAPER_SERVICE_ID!;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  async cleanup() {
    await this.stateManager.cleanup();
  }
}
