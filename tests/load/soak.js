// SOAK: 150 VUs durante 4 horas. Detecta memory leaks, degradación del caché
// y acumulación de conexiones. Comparar p95 de la hora 1 vs hora 4 (< 10% drift)
// en el dashboard de Cloud Monitoring en paralelo.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { searchUrl } from './common.js';

export const options = {
  scenarios: {
    soak: { executor: 'constant-vus', vus: 150, duration: '4h' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
};

export default function () {
  const res = http.get(searchUrl());
  check(res, { ok: (x) => x.status === 200 });
  sleep(2 + Math.random() * 3);
}
