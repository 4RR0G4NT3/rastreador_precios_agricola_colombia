import { test, expect } from '@playwright/test';

test.describe('Security - API Abuse & Negative Testing', () => {
  
  test('smoke test - should return 200 for valid request', async ({ request }) => {
    const response = await request.get('/api/prices?limit=10');
    expect(response.status()).toBe(200);
  });

  test('should return 400 for invalid pagination parameters (SQL Injection attempt)', async ({ request }) => {
    // Attempting a simple SQL injection in the limit parameter
    const response = await request.get('/api/prices?limit=10; DROP TABLE products');
    
    // We expect the API to handle this gracefully, usually by returning a 400 or just ignoring the malformed part
    // but definitely not crashing or executing the query.
    // Given most frameworks validation, 400 is a safe bet for malformed input.
    expect(response.status()).toBe(400);
  });

  test('should return 400 for non-numeric limit', async ({ request }) => {
    const response = await request.get('/api/prices?limit=abc');
    expect(response.status()).toBe(400);
  });

  test('should return 400 for extremely large limit (DoS protection)', async ({ request }) => {
    const response = await request.get('/api/prices?limit=999999999');
    expect(response.status()).toBe(400);
  });

});
