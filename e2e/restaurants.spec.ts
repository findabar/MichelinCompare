import { test, expect } from '@playwright/test';
import { createTestUser } from './utils/testUser';
import { loginUser } from './utils/auth';

test.describe('Restaurant Search', () => {
  test.beforeEach(async ({ page, request }) => {
    // Create and login test user
    const testUser = await createTestUser(request);
    await loginUser(page, testUser.email, testUser.password);
  });

  test('user can search for restaurants', async ({ page }) => {
    // Navigate to restaurants page
    await page.goto('/restaurants');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText(/restaurants/i);

    // Search for a restaurant
    await page.fill('input[placeholder*="search" i]', 'steak');

    // Wait for search results
    await page.waitForTimeout(1000); // Debounce delay

    // Verify results appear
    const restaurantCards = page.locator('[data-testid="restaurant-card"]').or(
      page.locator('a[href*="/restaurants/"]')
    );
    await expect(restaurantCards.first()).toBeVisible();
  });

  test('user can view list of restaurants', async ({ page }) => {
    await page.goto('/restaurants');

    // Verify restaurant list loads
    await expect(page.locator('h1')).toContainText(/restaurants/i);

    // Verify at least one restaurant is visible
    const restaurantLinks = page.locator('a[href*="/restaurants/"]');
    await expect(restaurantLinks.first()).toBeVisible();
  });
});
