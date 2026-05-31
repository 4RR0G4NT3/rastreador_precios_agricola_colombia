import { test, expect } from '@playwright/test';

test.describe('Modular API Tests - Products & Markets', () => {
  
  test('should return a list of products', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.ok()).toBeTruthy();
    
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
    expect(products.length).toBeGreaterThan(0);
  });

  test('should return a list of markets', async ({ request }) => {
    const response = await request.get('/api/markets');
    expect(response.ok()).toBeTruthy();
    
    const markets = await response.json();
    expect(Array.isArray(markets)).toBeTruthy();
    expect(markets.length).toBeGreaterThan(0);
  });

  test('should return prices with pagination metadata', async ({ request }) => {
    const response = await request.get('/api/prices?limit=10');
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');
    expect(result.data.length).toBeLessThanOrEqual(10);
  });

});
