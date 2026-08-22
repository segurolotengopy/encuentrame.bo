import { useNavigate } from 'react-router-dom';
import { useSession } from '../../stores/session';
import { ensureSellerClaim } from './useAuth';

export function RoleSelectPage() {
  const nav = useNavigate();
  const setActiveRole = useSession((s) => s.setActiveRole);
  const user = useSession((s) => s.user);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-teal-50 px-4">
      <h1 className="text-2xl font-bold">¿Qué quieres hacer hoy?</h1>
      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <button
          className="rounded-2xl bg-white p-8 text-center shadow-sm border-2 border-transparent hover:border-brand"
          onClick={() => {
            setActiveRole('buyer');
            nav('/mapa');
          }}
        >
          <div className="text-5xl">🛒</div>
          <div className="mt-2 text-lg font-bold">Comprar</div>
          <div className="text-sm text-gray-500">Ver el mapa de puestos</div>
        </button>
        <button
          className="rounded-2xl bg-white p-8 text-center shadow-sm border-2 border-transparent hover:border-brand"
          onClick={() => {
            setActiveRole('seller');
            // Habilita el rol y refresca el claim mientras el panel carga: así el
            // primer "Crear puesto" ya encuentra el token con `seller: true`.
            if (user) void ensureSellerClaim(user);
            nav('/vendedor');
          }}
        >
          <div className="text-5xl">🏪</div>
          <div className="mt-2 text-lg font-bold">Vender</div>
          <div className="text-sm text-gray-500">Gestionar mis puestos</div>
        </button>
      </div>
    </main>
  );
}
