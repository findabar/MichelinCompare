import axios from 'axios';
import { config } from '../config';
import {
  AlertContext,
  ValidationResult,
  IssueCategorization,
  LogAnalysis,
  HealthCheck,
  RemediationResult,
  KnownIssue,
} from '../types';
import logger from '../utils/logger';

export class GitHubService {
  private baseUrl = 'https://api.github.com';
  private headers = {
    Authorization: `Bearer ${config.github.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async createIssue(params: {
    alert: AlertContext;
    validation: ValidationResult;
    categorization: IssueCategorization;
    logAnalysis: LogAnalysis;
    healthCheck: HealthCheck;
    remediationResult?: RemediationResult;
  }): Promise<{ number: number; html_url: string }> {
    const { alert, validation, categorization, logAnalysis, healthCheck, remediationResult } = params;

    logger.info('Creating GitHub issue', { alertName: alert.alertName });

    const title = this.generateTitle(alert, categorization);
    const body = this.generateBody({
      alert,
      validation,
      categorization,
      logAnalysis,
      healthCheck,
      remediationResult,
    });

    const labels = this.generateLabels(categorization);

    try {
      const response = await axios.post(
        `${this.baseUrl}/repos/${config.github.owner}/${config.github.repo}/issues`,
        {
          title,
          body,
          labels,
        },
        { headers: this.headers }
      );

      logger.info('GitHub issue created', {
        number: response.data.number,
        url: response.data.html_url,
      });

      return {
        number: response.data.number,
        html_url: response.data.html_url,
      };
    } catch (error: any) {
      logger.error('Failed to create GitHub issue', {
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async updateIssue(
    issueNumber: number,
    comment: string
  ): Promise<void> {
    logger.info('Updating GitHub issue', { issueNumber });

    try {
      await axios.post(
        `${this.baseUrl}/repos/${config.github.owner}/${config.github.repo}/issues/${issueNumber}/comments`,
        { body: comment },
        { headers: this.headers }
      );

      logger.info('GitHub issue updated', { issueNumber });
    } catch (error: any) {
      logger.error('Failed to update GitHub issue', {
        error: error.message,
        issueNumber,
      });
    }
  }

  private generateTitle(alert: AlertContext, categorization: IssueCategorization): string {
    const prefix = categorization.severity === 'critical' ? '🚨' : '⚠️';
    return `${prefix} [${categorization.component}] ${alert.alertName}`;
  }

  private generateBody(params: {
    alert: AlertContext;
    validation: ValidationResult;
    categorization: IssueCategorization;
    logAnalysis: LogAnalysis;
    healthCheck: HealthCheck;
    remediationResult?: RemediationResult;
  }): string {
    const { alert, validation, categorization, logAnalysis, healthCheck, remediationResult } = params;

    let body = `## 🚨 Automated Alert: ${categorization.type} - ${alert.alertName}\n\n`;

    body += `**Severity**: ${categorization.severity}\n`;
    body += `**Component**: ${categorization.component}\n`;
    body += `**First Detected**: ${alert.timestamp.toISOString()}\n`;
    body += `**Status**: Investigating\n\n`;

    body += `---\n\n`;

    body += `### Problem Summary\n`;
    body += `${validation.reason}\n\n`;

    body += `### Impact\n`;
    body += `- **Affected Service**: ${alert.affectedService}\n`;
    body += `- **Error Rate**: ${logAnalysis.frequency} occurrences\n`;
    body += `- **Time Window**: ${alert.metrics.timeWindow}\n`;
    if (logAnalysis.affectedEndpoints.length > 0) {
      body += `- **Affected Endpoints**: ${logAnalysis.affectedEndpoints.join(', ')}\n`;
    }
    body += `\n`;

    body += `### Error Details\n`;
    if (logAnalysis.errorMessages.length > 0) {
      body += `\`\`\`\n${logAnalysis.errorMessages[0]}\n\`\`\`\n\n`;
    }

    if (logAnalysis.stackTraces.length > 0) {
      body += `**Stack Trace**:\n`;
      body += `\`\`\`\n${logAnalysis.stackTraces[0]}\n\`\`\`\n\n`;
    }

    body += `### Investigation Results\n`;
    body += `- ${healthCheck.apiResponsive ? '✅' : '❌'} API Responsive\n`;
    body += `- ${healthCheck.databaseConnected ? '✅' : '❌'} Database Connected\n`;
    body += `- ⏱️ Response Time: ${healthCheck.responseTime}ms\n`;
    body += `- 📊 Error Frequency: ${logAnalysis.frequency} occurrences\n`;
    body += `- 🎯 Confidence: ${validation.confidence}%\n\n`;

    if (remediationResult?.attempted) {
      body += `### Auto-Remediation Attempted\n`;
      body += `**Action Taken**: ${remediationResult.action}\n`;
      body += `**Result**: ${remediationResult.success ? '✅ Success' : '❌ Failed'}\n`;
      if (!remediationResult.success) {
        body += `**Logs**:\n\`\`\`\n${remediationResult.logs.join('\n')}\n\`\`\`\n\n`;
      }
    }

    if (validation.knownIssue) {
      body += `### Known Issue Match\n`;
      body += `**Title**: ${validation.knownIssue.title}\n`;
      body += `**Solution**: ${validation.knownIssue.solution}\n`;
      body += `**Previous Occurrences**: ${validation.knownIssue.occurrences}\n\n`;
    }

    body += `### Related Logs\n`;
    body += `**Loki Query**:\n`;
    body += `\`\`\`\n${alert.logQuery}\n\`\`\`\n\n`;

    if (logAnalysis.errorMessages.length > 1) {
      body += `**Sample Log Entries**:\n`;
      body += `\`\`\`\n${logAnalysis.errorMessages.slice(0, 3).join('\n')}\n\`\`\`\n\n`;
    }

    body += `### Recommended Actions\n`;
    body += this.generateRecommendations(categorization, validation.knownIssue);
    body += `\n\n`;

    body += `---\n\n`;
    body += `**Grafana Dashboard**: [View in Grafana](${config.grafana.url})\n\n`;

    body += `---\n`;
    body += `*This issue was automatically created by the Issue Intelligence Service*\n`;
    body += `*Last updated: ${new Date().toISOString()}*`;

    return body;
  }

  private generateLabels(categorization: IssueCategorization): string[] {
    const labels = [...config.github.defaultLabels];

    labels.push(categorization.severity);
    labels.push(categorization.type);
    labels.push(categorization.component);

    return labels;
  }

  private generateRecommendations(categorization: IssueCategorization, knownIssue?: KnownIssue): string {
    if (knownIssue) {
      return `- ${knownIssue.solution}`;
    }

    const recommendations: string[] = [];

    switch (categorization.type) {
      case 'database':
        recommendations.push('- Check database connection pool settings');
        recommendations.push('- Review recent database migrations');
        recommendations.push('- Check for long-running queries');
        break;

      case 'performance':
        recommendations.push('- Review recent code changes that may impact performance');
        recommendations.push('- Check for memory leaks');
        recommendations.push('- Consider scaling resources if load has increased');
        break;

      case 'infrastructure':
        recommendations.push('- Check Railway service status');
        recommendations.push('- Review recent deployments');
        recommendations.push('- Verify environment variables are set correctly');
        break;

      default:
        recommendations.push('- Review logs for root cause');
        recommendations.push('- Check recent deployments');
        recommendations.push('- Verify external service dependencies');
    }

    return recommendations.join('\n');
  }
}
