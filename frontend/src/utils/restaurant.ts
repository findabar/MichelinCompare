import { Restaurant } from '../types';

/**
 * Get the number of Michelin stars for a restaurant
 * Uses distinction field if available, falls back to michelinStars
 */
export function getStarCount(restaurant: Restaurant | { distinction?: string | null; michelinStars: number }): number {
  if (restaurant.distinction) {
    const stars = parseInt(restaurant.distinction);
    if (!isNaN(stars) && stars >= 1 && stars <= 3) {
      return stars;
    }
  }
  return restaurant.michelinStars;
}

/**
 * Render star emoji based on count
 */
export function renderStars(count: number): string {
  return '⭐'.repeat(count);
}
