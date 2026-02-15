import { test, expect } from '@playwright/test';

test('ホームページが正常に読み込まれる', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DecentralizedVideo/i);
});
