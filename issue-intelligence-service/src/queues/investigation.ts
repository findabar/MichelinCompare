import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import logger from '../utils/logger';
import { AlertContext } from '../types';

// Services
import { LokiService } from '../services/lokiService';
import { HealthCheckService } from '../services/healthCheckService';
import { HistoricalService } from '../services/historicalService';
import { KnownIssueService } from '../services/knownIssueService';
import { ValidationService } from '../services/validationService';
import { CategorizationService } from '../services/categorizationService';
import { RemediationService } from '../services/remediationService';
import { SlackService } from '../services/slackService';
import { GitHubService } from '../services/githubService';

const prisma = new PrismaClient();

// Initialize services
const lokiService = new LokiService();
const healthCheckService = new HealthCheckService();
const historicalService = new HistoricalService();
const knownIssueService = new KnownIssueService();
const validationService = new ValidationService();
const categorizationService = new CategorizationService();
const remediationService = new RemediationService();
const slackService = new SlackService();
const githubService = new GitHubService();

export const investigationQueue = new Queue('investigation', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

investigationQueue.process(async (job) => {
  const { alert } = job.data as { alert: AlertContext };

  logger.info('Processing alert investigation', { alertId: alert.alertName });

  try {
    // Step 1: Gather context (already done by parser)
    job.progress(10);

    // Step 2: Analyze logs
    const logAnalysis = await lokiService.analyzeLogs(alert);
    job.progress(30);

    // Step 3: Health checks
    const healthCheck = await healthCheckService.performHealthChecks(alert.affectedService);
    job.progress(40);

    // Step 4: Historical analysis
    const historical = await historicalService.checkHistoricalData(alert);
    job.progress(50);

    // Step 5: Check known issues
    const knownIssue = await knownIssueService.matchKnownIssue(logAnalysis);
    job.progress(60);

    // Step 6: Validate
    const validation = validationService.validate({
      context: alert,
      logAnalysis,
      healthCheck,
      historical,
      knownIssue,
    });
    job.progress(70);

    // Step 7: Categorize
    const categorization = categorizationService.categorize({
      logAnalysis,
      healthCheck,
      knownIssue: knownIssue || undefined,
    });

    // Save alert event to database
    const alertEvent = await prisma.alertEvent.create({
      data: {
        alertId: `${alert.alertName}-${Date.now()}`,
        alertName: alert.alertName,
        severity: categorization.severity,
        receivedAt: alert.timestamp,
        investigatedAt: new Date(),
        isRealIssue: validation.isRealIssue,
        confidence: validation.confidence,
        validationReason: validation.reason,
        category: categorization.type,
        type: categorization.type,
        component: categorization.component,
        logAnalysis: logAnalysis as any,
        healthCheck: healthCheck as any,
        historicalContext: historical as any,
        rawAlertPayload: alert as any,
      },
    });

    job.progress(75);

    // Step 8: Send initial Slack notification
    const slackMessage = await slackService.sendAlert({
      alert,
      validation,
      categorization,
    });

    await prisma.alertEvent.update({
      where: { id: alertEvent.id },
      data: {
        slackMessageTs: slackMessage.ts,
        slackChannel: slackMessage.channel,
      },
    });

    job.progress(80);

    // Step 9: Attempt auto-remediation if applicable
    let remediationResult = null;
    if (validation.shouldAttemptRemediation && knownIssue?.autoRemediable) {
      remediationResult = await remediationService.attemptRemediation({
        alert,
        knownIssue,
        alertEventId: alertEvent.id,
      });

      await prisma.alertEvent.update({
        where: { id: alertEvent.id },
        data: {
          remediationAttempted: true,
          remediationSuccess: remediationResult.success,
          remediationStrategy: remediationResult.action,
        },
      });

      // Update Slack thread with remediation status
      await slackService.updateThread(slackMessage.ts, slackMessage.channel, {
        remediation: remediationResult,
      });

      // If remediation successful, send resolution notification and exit
      if (remediationResult.success) {
        await slackService.sendResolutionNotification({
          alert,
          remediation: remediationResult,
        });

        logger.info('Alert auto-resolved via remediation', {
          alertId: alertEvent.id,
          action: remediationResult.action,
        });

        return;
      }
    }

    job.progress(90);

    // Step 10: Create GitHub issue (only if remediation failed or not attempted)
    if (validation.isRealIssue && validation.shouldCreateIssue) {
      const githubIssue = await githubService.createIssue({
        alert,
        validation,
        categorization,
        logAnalysis,
        healthCheck,
        remediationResult: remediationResult || undefined,
      });

      await prisma.alertEvent.update({
        where: { id: alertEvent.id },
        data: {
          githubIssueNumber: githubIssue.number,
          githubIssueUrl: githubIssue.html_url,
          createdIssueAt: new Date(),
        },
      });

      // Update Slack with GitHub issue link
      await slackService.updateThread(slackMessage.ts, slackMessage.channel, {
        githubIssue,
      });

      logger.info('GitHub issue created', {
        alertId: alertEvent.id,
        issueNumber: githubIssue.number,
      });
    }

    job.progress(100);

    logger.info('Alert investigation complete', {
      alertId: alertEvent.id,
      isRealIssue: validation.isRealIssue,
      githubIssueCreated: !!validation.shouldCreateIssue,
    });
  } catch (error) {
    logger.error('Alert investigation failed', { error, alert: alert.alertName });
    throw error;
  }
});

investigationQueue.on('completed', (job) => {
  logger.info('Investigation job completed', { jobId: job.id });
});

investigationQueue.on('failed', (job, error) => {
  logger.error('Investigation job failed', {
    jobId: job?.id,
    error: error.message,
  });
});
