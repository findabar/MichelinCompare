import { test, expect } from '@playwright/test';
import { createTestUser } from './utils/testUser';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page, request }) => {
    // Create test user via API
    const testUser = await createTestUser(request);

    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user is logged in (check for username in UI)
    await expect(page.locator('text=' + testUser.username)).toBeVisible();
  });

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator('text=/invalid.*email.*password/i')).toBeVisible();

    // Verify still on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
