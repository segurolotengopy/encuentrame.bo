import type { Firestore } from 'firebase-admin/firestore';

export const m001 = {
  id: '001_seed_categories',
  async up(db: Firestore) {
    const categories = [
      { id: 'general', name: 'General', icon: '🏪' },
      { id: 'comida', name: 'Comida y bebidas', icon: '🍲' },
      { id: 'ropa', name: 'Ropa y calzado', icon: '👕' },
      { id: 'abarrotes', name: 'Abarrotes', icon: '🧺' },
      { id: 'frutas_verduras', name: 'Frutas y verduras', icon: '🍎' },
      { id: 'servicios', name: 'Servicios', icon: '🧰' },
      { id: 'artesania', name: 'Artesanía', icon: '🧶' },
      { id: 'electronica', name: 'Electrónica', icon: '📱' },
    ];
    const batch = db.batch();
    for (const c of categories) batch.set(db.collection('master_categories').doc(c.id), c, { merge: true });
    await batch.commit();
  },
};
