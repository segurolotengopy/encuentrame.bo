/**
 * Tests de Security Rules (RLS) — se ejecutan contra el emulador:
 *   pnpm test:rules
 * CI bloquea el deploy si el aislamiento multi-usuario se rompe.
 */
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;

const SELLER = { uid: 'seller_1', token: { seller: true } };
const OTHER = { uid: 'seller_2', token: { seller: true } };
const BUYER = { uid: 'buyer_1', token: {} };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-encuentrame',
    firestore: { rules: readFileSync('infra/firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

function asUser(u: { uid: string; token: Record<string, unknown> }) {
  return env.authenticatedContext(u.uid, u.token).firestore();
}

describe('stalls — aislamiento por dueño', () => {
  it('un vendedor crea su propio puesto', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(SELLER), 'stalls/s1'), {
        ownerUid: SELLER.uid,
        name: 'Puesto de Prueba',
        categoryId: 'comida',
        status: 'closed',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('NADIE puede crear un puesto a nombre de otro', async () => {
    await assertFails(
      setDoc(doc(asUser(OTHER), 'stalls/s_ajeno'), {
        ownerUid: SELLER.uid, // suplantación
        name: 'Puesto Falso',
        categoryId: 'comida',
        status: 'closed',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('un comprador (sin claim seller) no puede crear puestos', async () => {
    await assertFails(
      setDoc(doc(asUser(BUYER), 'stalls/s2'), {
        ownerUid: BUYER.uid,
        name: 'X',
        categoryId: 'comida',
        status: 'closed',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('otro vendedor NO puede modificar un puesto ajeno', async () => {
    await assertFails(updateDoc(doc(asUser(OTHER), 'stalls/s1'), { name: 'Hackeado' }));
  });

  it('el cliente NO puede cambiar el estado abierto/cerrado (solo backend)', async () => {
    await assertFails(updateDoc(doc(asUser(SELLER), 'stalls/s1'), { status: 'open' }));
  });

  it('lectura pública del catálogo', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'stalls/s1')));
  });
});

describe('openings — evento inmutable', () => {
  it('el dueño registra apertura pending de su puesto', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(SELLER), 'openings/s1_2026-08-16'), {
        ownerUid: SELLER.uid,
        stallId: 's1',
        status: 'pending',
        geohash: '6mpvv2k',
        lat: -16.5,
        lng: -68.15,
        photoPath: `openings/${SELLER.uid}/s1_2026-08-16.jpg`,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('nadie auto-verifica su apertura (status != pending rechazado)', async () => {
    await assertFails(
      setDoc(doc(asUser(SELLER), 'openings/s1_trampa'), {
        ownerUid: SELLER.uid,
        stallId: 's1',
        status: 'verified', // intento de saltarse la IA
        geohash: '6mpvv2k',
        lat: -16.5,
        lng: -68.15,
        photoPath: 'openings/x/y.jpg',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('las aperturas no se editan ni borran desde el cliente', async () => {
    await assertFails(updateDoc(doc(asUser(SELLER), 'openings/s1_2026-08-16'), { status: 'verified' }));
    await assertFails(deleteDoc(doc(asUser(SELLER), 'openings/s1_2026-08-16')));
  });

  it('no se puede abrir el puesto de OTRO vendedor', async () => {
    await assertFails(
      setDoc(doc(asUser(OTHER), 'openings/s1_2026-08-17'), {
        ownerUid: OTHER.uid,
        stallId: 's1', // puesto de SELLER
        status: 'pending',
        geohash: '6mpvv2k',
        lat: -16.5,
        lng: -68.15,
        photoPath: `openings/${OTHER.uid}/s1.jpg`,
        createdAt: serverTimestamp(),
      }),
    );
  });
});

describe('ledgers — contabilidad estrictamente privada', () => {
  it('el dueño escribe y lee su libro', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(SELLER), `ledgers/${SELLER.uid}/entries/e1`), {
        type: 'sale',
        amountBob: 25,
        concept: 'venta salteñas',
        source: 'manual',
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(asUser(SELLER), `ledgers/${SELLER.uid}/entries/e1`)));
  });

  it('NADIE más lee el libro ajeno (aislamiento total)', async () => {
    await assertFails(getDoc(doc(asUser(OTHER), `ledgers/${SELLER.uid}/entries/e1`)));
  });

  it('los asientos son inmutables', async () => {
    await assertFails(updateDoc(doc(asUser(SELLER), `ledgers/${SELLER.uid}/entries/e1`), { amountBob: 9999 }));
  });
});

describe('meta-índices y maestras — solo backend escribe', () => {
  it('cliente no escribe search_index ni geo_tiles ni maestras', async () => {
    await assertFails(setDoc(doc(asUser(SELLER), 'search_index/papa'), { stallIds: ['s1'] }));
    await assertFails(setDoc(doc(asUser(SELLER), 'geo_tiles/6mpvv'), { entries: [] }));
    await assertFails(setDoc(doc(asUser(SELLER), 'master_products/papa'), { name: 'Papa' }));
  });
});
