export const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5000';

// Celdas geohash de La Paz / El Alto para búsquedas realistas
export const TILES = ['6mpvv', '6mpvy', '6mpvt', '6mpvw'];
export const QUERIES = ['api', 'saltena', 'papa', 'polera', 'jugo', 'costurera'];

export function searchUrl() {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const tiles = TILES.slice(0, 1 + Math.floor(Math.random() * 3)).join(',');
  return `${BASE}/v1/search?q=${q}&tiles=${tiles}`;
}
