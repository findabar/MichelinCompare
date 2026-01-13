import { Router } from 'express';
import { investigationQueue } from '../queues/investigation';
import { parseGrafanaAlert } from '../services/alertParser';
import logger from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /alerts/grafana - Receive Grafana webhook alerts
router.post('/grafana', async (req, res) => {
  try {
    logger.info('Received Grafana alert', { body: req.body });

    // Parse the alert
    const alert = parseGrafanaAlert(req.body);

    // Immediately acknowledge receipt
    res.json({
      success: true,
      alertId: alert.alertName,
      message: 'Alert received and queued for investigation',
    });

    // Queue for async investigation
    await investigationQueue.add('investigate', {
      alert,
      receivedAt: new Date(),
    });

    logger.info('Alert queued for investigation', { alertName: alert.alertName });
  } catch (error: any) {
    logger.error('Failed to process Grafana alert', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /alerts/history - Get recent alert history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const alerts = await prisma.alertEvent.findMany({
      orderBy: {
        receivedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        alertName: true,
        severity: true,
        receivedAt: true,
        isRealIssue: true,
        confidence: true,
        githubIssueNumber: true,
        githubIssueUrl: true,
        remediationAttempted: true,
        remediationSuccess: true,
      },
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error: any) {
    logger.error('Failed to fetch alert history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /alerts/:id - Get alert details
router.get('/:id', async (req, res) => {
  try {
    const alert = await prisma.alertEvent.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        updates: true,
        remediationAttempts: {
          include: {
            knownIssue: true,
          },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error: any) {
    logger.error('Failed to fetch alert details', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
