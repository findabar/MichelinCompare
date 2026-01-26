import { test, expect } from '@playwright/test';
import { createTestUser } from './utils/testUser';
import { loginUser } from './utils/auth';

test.describe('Restaurant Details', () => {
  test.beforeEach(async ({ page, request }) => {
    const testUser = await createTestUser(request);
    await loginUser(page, testUser.email, testUser.password);
  });

  test('user can view restaurant details', async ({ page }) => {
    // Navigate to restaurants and click first restaurant
    await page.goto('/restaurants');

    const firstRestaurant = page.locator('a[href*="/restaurants/"]').first();
    const restaurantName = await firstRestaurant.textContent();

    await firstRestaurant.click();

    // Verify restaurant detail page loaded
    await expect(page).toHaveURL(/\/restaurants\/[a-zA-Z0-9-]+/);

    // Verify restaurant name is displayed
    await expect(page.locator('h1')).toContainText(restaurantName || '');

    // Verify key information is present
    await expect(page.locator('text=/michelin star/i')).toBeVisible();
    await expect(page.locator('text=/cuisine|address|city/i')).toBeVisible();
  });

  test('restaurant details show correct star rating', async ({ page }) => {
    await page.goto('/restaurants');

    // Get first restaurant link
    const firstRestaurant = page.locator('a[href*="/restaurants/"]').first();
    await firstRestaurant.click();

    // Verify star rating is visible (1-3 stars)
    const starIcons = page.locator('[class*="star" i]').or(
      page.locator('svg[class*="star" i]')
    );

    const starCount = await starIcons.count();
    expect(starCount).toBeGreaterThan(0);
    expect(starCount).toBeLessThanOrEqual(3);
  });
});
