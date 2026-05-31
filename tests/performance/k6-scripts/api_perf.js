import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Ramp-up: 20 usuarios en 10s
    { duration: '30s', target: 20 }, // Carga constante
    { duration: '10s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // El 95% de las peticiones deben ser < 500ms
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // 1. Prueba la Caché (debe ser muy rápido)
  const resProducts = http.get(`${BASE_URL}/api/products`);
  check(resProducts, { 'status products is 200': (r) => r.status === 200 });

  // 2. Prueba el endpoint de precios (Base de datos)
  const resPrices = http.get(`${BASE_URL}/api/prices?product=Papa%20suprema&limit=50`);
  check(resPrices, { 'status prices is 200': (r) => r.status === 200 });

  sleep(1);
}
