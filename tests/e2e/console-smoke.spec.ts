import { test, expect } from '@playwright/test';

// Console boots without Supabase and shows the unconfigured banner on /login.
test('login page renders without Supabase env', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Stigg OS')).toBeVisible();
  await expect(page.getByText('Supabase is not configured')).toBeVisible();
});

// Routes that require a session redirect to /login.
test('protected routes redirect to login when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
