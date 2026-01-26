import { Page } from '@playwright/test';

export async function loginUser(
  page: Page,
  email: string,
  password: string
) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard');
}
