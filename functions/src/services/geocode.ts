import { db, Timestamp } from '../lib/firestore.js';
import { normalizeText } from '@encuentrame/shared';

const TTL_DAYS = 30;

/**
 * Geocoding híbrido: Google Geocoding API con caché L4 en Firestore.
 * Una dirección repetida ("feria 16 de julio") se paga UNA vez al mes.
 */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const key = normalizeText(address).replace(/\s/g, '_').slice(0, 200);
  const cacheRef = db.collection('geocode_cache').doc(key);
  const cachedSnap = await cacheRef.get();
  if (cachedSnap.exists) {
    const data = cachedSnap.data()!;
    if ((data.expireAt as Timestamp).toMillis() > Date.now()) {
      return data.result as { lat: number; lng: number; formatted: string };
    }
  }

  const apiKey = process.env.GEOCODING_API_KEY;
  if (!apiKey) {
    console.error('geocode_error', 'GEOCODING_API_KEY no configurada (Secret Manager)');
    return null;
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=bo&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    status: string;
    results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[];
  };
  const first = body.results?.[0];
  if (body.status !== 'OK' || !first) return null;

  const result = {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formatted: first.formatted_address,
  };
  await cacheRef.set({
    result,
    expireAt: Timestamp.fromMillis(Date.now() + TTL_DAYS * 86400_000),
  });
  return result;
}
