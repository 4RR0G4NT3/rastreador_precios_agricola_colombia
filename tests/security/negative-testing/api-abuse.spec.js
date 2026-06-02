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

  test('security headers should be present', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('should prevent path traversal (accessing .env)', async ({ request }) => {
    // Attempting to go up from public/ to root to read .env
    const response = await request.get('/../.env');
    
    // The server should either return 404 (because it prepends PUBLIC_DIR) 
    // or handle the traversal safely.
    expect(response.status()).toBe(404);
    
    const text = await response.text();
    expect(text).not.toContain('MONGODB_URI');
  });

  test('should prevent path traversal (accessing package.json)', async ({ request }) => {
    const response = await request.get('/../package.json');
    expect(response.status()).toBe(404);
  });

  test('should prevent NoSQL injection via arrays in query', async ({ request }) => {
    // url.parse can return an array if multiple params with the same name are passed
    const response = await request.get('/api/prices?product=a&product=b');
    expect(response.status()).toBe(400);
  });

  test('should trigger rate limiting (429) after 100 requests', async ({ request }) => {
    test.setTimeout(60000); // Dar más tiempo a esta prueba específica
    
    // Enviar 105 peticiones en paralelo para ser más rápidos
    const requests = [];
    for (let i = 0; i < 105; i++) {
        requests.push(request.get('/api/prices?limit=1'));
    }
    
    const responses = await Promise.all(requests);
    const status429Received = responses.some(res => res.status() === 429);
    
    expect(status429Received).toBe(true);
  });

});
