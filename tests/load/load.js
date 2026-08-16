// LOAD: carga esperada de producción — 200 VUs, 10 min
// Mezcla: 80% búsqueda/mapa, 15% health (proxy de lecturas), 5% escritura simulada
import http from 'k6/http';
import { check, sleep } from 'k6';
import { searchUrl, BASE } from './common.js';

export const options = {
  scenarios: {
    steady: { executor: 'constant-vus', vus: 200, duration: '10m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],           // < 0.5% errores
    'http_req_duration{kind:search}': ['p(95)<800'],
    'http_req_duration{kind:health}': ['p(95)<400'],
  },
};

export default function () {
  const r = Math.random();
  if (r < 0.8) {
    const res = http.get(searchUrl(), { tags: { kind: 'search' } });
    check(res, { 'search 200': (x) => x.status === 200 });
  } else {
    const res = http.get(`${BASE}/v1/health`, { tags: { kind: 'health' } });
    check(res, { 'health 200': (x) => x.status === 200 });
  }
  sleep(1 + Math.random() * 2);
}
