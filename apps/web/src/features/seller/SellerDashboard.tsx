import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSession } from '../../stores/session';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api-client';

interface StallDoc {
  id: string;
  name: string;
  categoryId: string;
  status: 'open' | 'closed';
}

export function SellerDashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [showForm, setShowForm] = useState(false);

  const stalls = useQuery({
    queryKey: ['stalls', user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'stalls'), where('ownerUid', '==', user!.uid), orderBy('createdAt', 'desc')),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StallDoc);
    },
  });

  const openings = useQuery({
    queryKey: ['openings-history', user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'openings'),
          where('ownerUid', '==', user!.uid),
          orderBy('createdAt', 'desc'),
          limit(15),
        ),
      );
      return snap.docs.map((d) => {
        const data = d.data() as { stallName?: string; stallId?: string; status?: string };
        return { id: d.id, ...data };
      });
    },
  });

  const createStall = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, 'stalls'), {
        ownerUid: user!.uid,
        name: newName.trim(),
        categoryId: newCategory,
        status: 'closed',
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      setNewName('');
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['stalls'] });
    },
  });

  const closeStall = useMutation({
    mutationFn: (openingId: string) => api.closeOpening(openingId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['stalls'] }),
  });

  if (stalls.isLoading) return <Spinner full />;

  const todayId = (stallId: string) =>
    `${stallId}_${new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis puestos</h1>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          + Nuevo puesto
        </Button>
      </header>

      {showForm && (
        <Card className="mt-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createStall.mutate();
            }}
          >
            <input
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Nombre del puesto (ej: Doña Elvira — Jugos)"
              value={newName}
              maxLength={80}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="general">General</option>
              <option value="comida">Comida y bebidas</option>
              <option value="ropa">Ropa y calzado</option>
              <option value="abarrotes">Abarrotes</option>
              <option value="frutas_verduras">Frutas y verduras</option>
              <option value="servicios">Servicios</option>
              <option value="artesania">Artesanía</option>
            </select>
            <Button type="submit" className="w-full" disabled={createStall.isPending}>
              Crear puesto
            </Button>
          </form>
        </Card>
      )}

      <section className="mt-4 space-y-3">
        {(stalls.data ?? []).map((stall) => (
          <Card key={stall.id} className="flex items-center justify-between">
            <div>
              <div className="font-bold">{stall.name}</div>
              <div className={`text-sm ${stall.status === 'open' ? 'text-green-600' : 'text-gray-400'}`}>
                {stall.status === 'open' ? '● Abierto' : '○ Cerrado'}
              </div>
            </div>
            {stall.status === 'closed' ? (
              <Link to={`/vendedor/apertura/${stall.id}`}>
                <Button>📸 Abrir</Button>
              </Link>
            ) : (
              <Button
                variant="ghost"
                disabled={closeStall.isPending}
                onClick={() => closeStall.mutate(todayId(stall.id))}
              >
                Cerrar
              </Button>
            )}
          </Card>
        ))}
        {stalls.data?.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            Aún no tienes puestos. Crea el primero: solo necesita un nombre y una categoría.
          </p>
        )}
      </section>

      <h2 className="mt-8 text-xl font-bold">Histórico de aperturas</h2>
      <section className="mt-2 space-y-2">
        {(openings.data ?? []).map((o) => (
          <div key={o.id} className="flex justify-between rounded-xl bg-gray-50 px-4 py-2 text-sm">
            <span>{o.stallName ?? o.stallId ?? o.id}</span>
            <span
              className={
                o.status === 'verified'
                  ? 'text-green-600'
                  : o.status === 'pending'
                    ? 'text-amber-600'
                    : 'text-red-500'
              }
            >
              {o.status === 'verified' ? 'Verificada' : o.status === 'pending' ? 'Verificando…' : 'Rechazada'}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
