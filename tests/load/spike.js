// SPIKE: la feria abre a las 8:00 — 50 → 600 VUs en 10 segundos.
// Verifica que la cola asíncrona absorbe el pico y la recuperación < 2 min.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { searchUrl } from './common.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '10s', target: 600 },  // el pico
        { duration: '2m', target: 600 },   // sostenido
        { duration: '2m', target: 50 },    // recuperación
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2500'],
  },
};

export default function () {
  const res = http.get(searchUrl());
  check(res, { 'respuesta valida': (x) => x.status === 200 || x.status === 429 });
  sleep(0.5);
}
