/** Precisión de celda para el mapa de teselas geoespaciales (≈ 39 km × 19.5 km en p4;
 *  usamos p5 ≈ 4.9 km × 4.9 km para ciudades bolivianas densas). */
export const GEO_TILE_PRECISION = 5;
/** Precisión del geohash publicado en aperturas (p7 ≈ 153 m — balance precisión/privacidad). */
export const OPENING_GEOHASH_PRECISION = 7;
/** Máximo de fotos de producto por apertura. */
export const MAX_PRODUCT_PHOTOS = 2;
/** Cuotas por defecto (se sobreescriben desde config/quotas en Firestore). */
export const DEFAULT_QUOTAS = {
  openingsPerDay: 20,
  voicePerDay: 60,
  searchPerMinute: 120,
  geocodePerMinute: 10,
} as const;

export const API_VERSION = 'v1';
