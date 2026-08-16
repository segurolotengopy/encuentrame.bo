/**
 * Ejecutor de migraciones idempotentes.
 * Uso: GOOGLE_CLOUD_PROJECT=encuentramebo-1 pnpm migrate
 * Registra cada migración aplicada en config/migrations para no repetirla.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { m001 } from './001_seed_categories.js';
import { m002 } from './002_seed_master_products.js';

initializeApp();
const db = getFirestore();
const migrations = [m001, m002];

const ledger = db.collection('config').doc('migrations');
const applied = ((await ledger.get()).data()?.applied as string[] | undefined) ?? [];

for (const m of migrations) {
  if (applied.includes(m.id)) {
    console.log(`↷ ${m.id} ya aplicada`);
    continue;
  }
  console.log(`▶ aplicando ${m.id}…`);
  await m.up(db);
  applied.push(m.id);
  await ledger.set({ applied }, { merge: true });
  console.log(`✔ ${m.id}`);
}
console.log('Migraciones al día.');
