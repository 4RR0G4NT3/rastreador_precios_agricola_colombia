import { test, expect } from '@playwright/test';

test.describe('E2E - Main Page Load', () => {

  test('should load the homepage and show the title', async ({ page }) => {
    await page.goto('/');
    
    // Check main title
    await expect(page).toHaveTitle(/Rastreador de Precios Agrícolas/);
    
    const header = page.locator('header h1');
    await expect(header).toContainText('Rastreador de Precios Agrícolas');
  });

  test('should load product and market options', async ({ page }) => {
    await page.goto('/');
    
    const productSelect = page.locator('#productSelect');
    const marketSelect = page.locator('#marketSelect');
    
    // Wait for the options to be populated (thanks to our cache it should be fast)
    await expect(productSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    await expect(marketSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    
    const productCount = await productSelect.locator('option').count();
    const marketCount = await marketSelect.locator('option').count();
    
    expect(productCount).toBeGreaterThan(1); // Default + products
    expect(marketCount).toBeGreaterThan(1);  // Default + markets
  });

});
