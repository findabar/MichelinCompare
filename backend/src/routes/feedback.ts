import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import Joi from 'joi';

const router = express.Router();

const feedbackSchema = Joi.object({
  feedbackType: Joi.string().valid('missing-restaurant', 'feature-request', 'bug-report', 'other').required(),
  description: Joi.string().min(10).max(2000).required(),
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { feedbackType, description } = value;
    const user = (req as any).user;

    if (!user) {
      return next(createError('Authentication required', 401));
    }

    await emailService.sendFeedbackEmail({
      userEmail: user.email,
      userName: user.username,
      feedbackType,
      description,
    });

    res.json({
      success: true,
      message: 'Thank you for your feedback! We will review it and get back to you if needed.',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    next(createError('Failed to submit feedback. Please try again later.', 500));
  }
});

export default router;