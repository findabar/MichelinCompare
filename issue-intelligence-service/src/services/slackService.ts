// TODO: Uncomment when Slack App is configured
// import { WebClient } from '@slack/web-api';
import { config } from '../config';
import {
  AlertContext,
  ValidationResult,
  RemediationResult,
  IssueCategorization,
} from '../types';
import logger from '../utils/logger';

export class SlackService {
  // private client: WebClient;

  constructor() {
    // TODO: Uncomment when Slack token is configured
    // this.client = new WebClient(config.slack.token);
    logger.info('SlackService initialized (Slack integration disabled - configure later)');
  }

  async sendAlert(params: {
    alert: AlertContext;
    validation: ValidationResult;
    categorization: IssueCategorization;
  }): Promise<{ ts: string; channel: string }> {
    const { alert, validation, categorization } = params;

    logger.info('[SLACK DISABLED] Would send alert', {
      alertName: alert.alertName,
      severity: categorization.severity,
      reason: validation.reason,
    });

    // Return mock response for now
    return {
      ts: `mock-ts-${Date.now()}`,
      channel: 'mock-channel',
    };

    /* TODO: Uncomment when Slack is configured
    const channel = this.getChannelForSeverity(categorization.severity);
    const emoji = this.getEmojiForSeverity(categorization.severity);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${categorization.severity.toUpperCase()}: ${alert.alertName}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${categorization.severity}`,
          },
          {
            type: 'mrkdwn',
            text: `*Component:*\n${categorization.component}`,
          },
          {
            type: 'mrkdwn',
            text: `*Service:*\n${alert.affectedService}`,
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:*\n${validation.confidence}%`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:*\n${validation.reason}`,
        },
      },
    ];

    // Add remediation status if applicable
    if (validation.shouldAttemptRemediation) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Auto-Remediation:*\n⚙️ Attempting automatic fix...',
        },
      });
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View in Grafana',
          },
          url: config.grafana.url || 'https://grafana.railway.app',
          action_id: 'view_grafana',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Logs',
          },
          url: `${config.grafana.url}/explore`,
          action_id: 'view_logs',
        },
      ],
    });

    try {
      const result = await this.client.chat.postMessage({
        channel,
        blocks,
        text: `${emoji} ${categorization.severity.toUpperCase()}: ${alert.alertName}`,
      });

      return {
        ts: result.ts!,
        channel: result.channel!,
      };
    } catch (error) {
      logger.error('Failed to send Slack alert', { error });
      throw error;
    }
    */
  }

  async updateThread(
    ts: string,
    channel: string,
    params: {
      remediation?: RemediationResult;
      githubIssue?: { number: number; html_url: string };
    }
  ): Promise<void> {
    const { remediation, githubIssue } = params;

    logger.info('[SLACK DISABLED] Would update thread', {
      ts,
      channel,
      remediationSuccess: remediation?.success,
      githubIssueNumber: githubIssue?.number,
    });

    // No-op for now
    return;

    /* TODO: Uncomment when Slack is configured
    let text = '';

    if (remediation) {
      if (remediation.success) {
        text = `✅ *Auto-Remediation Successful*\nAction: ${remediation.action}\nService restarted and health checks passing\n_No issue created_`;
      } else {
        text = `❌ *Auto-Remediation Failed*\nAction: ${remediation.action}\nIssue persisted after remediation attempt\n\`\`\`\n${remediation.logs.join('\n')}\n\`\`\``;
      }
    }

    if (githubIssue) {
      text += `\n\n📋 *GitHub Issue Created*\n<${githubIssue.html_url}|#${githubIssue.number}>`;
    }

    if (!text) return;

    try {
      await this.client.chat.postMessage({
        channel,
        thread_ts: ts,
        text,
      });

      logger.info('Updated Slack thread', { ts, channel });
    } catch (error) {
      logger.error('Failed to update Slack thread', { error, ts, channel });
    }
    */
  }

  async sendResolutionNotification(params: {
    alert: AlertContext;
    remediation: RemediationResult;
  }): Promise<void> {
    const { alert, remediation } = params;

    logger.info('[SLACK DISABLED] Would send resolution notification', {
      alertName: alert.alertName,
      action: remediation.action,
      success: remediation.success,
    });

    // No-op for now
    return;

    /* TODO: Uncomment when Slack is configured
    const channel = config.slack.channels.resolved;
    if (!channel) return;

    const text = `✅ *Alert Auto-Resolved*\n*Alert:* ${alert.alertName}\n*Action:* ${remediation.action}\n*Service:* ${alert.affectedService}\n\nService restarted successfully and health checks are passing.`;

    try {
      await this.client.chat.postMessage({
        channel,
        text,
      });

      logger.info('Sent resolution notification', { alertName: alert.alertName });
    } catch (error) {
      logger.error('Failed to send resolution notification', { error });
    }
    */
  }

  private getChannelForSeverity(severity: string): string {
    switch (severity) {
      case 'critical':
        return config.slack.channels.critical || '';
      case 'high':
        return config.slack.channels.high || '';
      case 'medium':
      case 'low':
        return config.slack.channels.medium || '';
      default:
        return config.slack.channels.medium || '';
    }
  }

  private getEmojiForSeverity(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📢';
    }
  }
}
