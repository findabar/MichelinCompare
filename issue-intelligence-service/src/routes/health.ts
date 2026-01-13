import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { investigationQueue } from '../queues/investigation';

const router = Router();
const prisma = new PrismaClient();

// GET /health - Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Check queue status
    const queueHealth = await investigationQueue.getJobCounts();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      queue: {
        waiting: queueHealth.waiting,
        active: queueHealth.active,
        completed: queueHealth.completed,
        failed: queueHealth.failed,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
