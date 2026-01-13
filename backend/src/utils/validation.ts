import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
}).options({ stripUnknown: true }); // Strip unknown fields like admin, isAdmin, role, etc.

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const visitSchema = Joi.object({
  restaurantId: Joi.string().required(),
  dateVisited: Joi.date().iso().required(),
  notes: Joi.string().allow('').optional(),
  bestDish: Joi.string().allow('').optional(),
  occasion: Joi.string().valid('celebration', 'solo', 'work', 'spontaneous').allow('').optional(),
  moodRating: Joi.number().integer().min(1).max(5).optional(),
});

export const restaurantQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  country: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  cuisineType: Joi.string().allow('').optional(),
  michelinStars: Joi.number().integer().min(0).max(3).optional(),
});

export const wishlistSchema = Joi.object({
  restaurantId: Joi.string().required(),
  note: Joi.string().trim().allow('').optional(),
});

export const travelPlanSchema = Joi.object({
  city: Joi.string().required(),
  country: Joi.string().optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  maxStarsPerDay: Joi.number().integer().min(1).max(6).optional(),
  preferredCuisines: Joi.array().items(Joi.string()).optional().default([]),
  includeVisited: Joi.boolean().optional().default(false),
});