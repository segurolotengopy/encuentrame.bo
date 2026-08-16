// STRESS: ramp 0 → 1000 VUs en 15 min. Objetivo: encontrar la rodilla de la
// curva y verificar que el sistema degrada con 429 controlados, nunca 5xx.
import http from 'k6/http';
import { check } from 'k6';
import { searchUrl } from './common.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 250 },
        { duration: '5m', target: 600 },
        { duration: '5m', target: 1000 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(99)<5000'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const res = http.get(searchUrl());
  check(res, {
    'sin 5xx (429 aceptable)': (x) => x.status < 500,
  });
}
