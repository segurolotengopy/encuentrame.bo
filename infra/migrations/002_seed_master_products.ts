import type { Firestore } from 'firebase-admin/firestore';

/** Tabla maestra anti-duplicados: nombres canónicos + alias regionales. */
export const m002 = {
  id: '002_seed_master_products',
  async up(db: Firestore) {
    const products = [
      { id: 'papa', name: 'Papa', alias: ['papas', 'patata'], categoryId: 'frutas_verduras' },
      { id: 'api', name: 'Api', alias: ['api morado'], categoryId: 'comida' },
      { id: 'pastel', name: 'Pastel', alias: ['pasteles'], categoryId: 'comida' },
      { id: 'salteña', name: 'Salteña', alias: ['saltenas', 'salteñas'], categoryId: 'comida' },
      { id: 'jugo', name: 'Jugo natural', alias: ['jugos', 'vitaminico'], categoryId: 'comida' },
      { id: 'polera', name: 'Polera', alias: ['poleras', 'camiseta'], categoryId: 'ropa' },
    ];
    const batch = db.batch();
    for (const p of products) batch.set(db.collection('master_products').doc(p.id), p, { merge: true });
    await batch.commit();
  },
};
