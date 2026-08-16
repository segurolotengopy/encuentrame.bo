import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Role } from '@encuentrame/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { auth, ensureProfile } from './useAuth';

export function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<Role[]>(['buyer']);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleRole(role: Role) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function register(useGoogle: boolean) {
    if (!accepted) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }
    if (roles.length === 0) {
      setError('Elige si compras, vendes o ambos.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cred = useGoogle ? await auth.loginGoogle() : await auth.registerEmail(email, password);
      await ensureProfile(cred.user, roles);
      nav('/acceso');
    } catch {
      setError('No pudimos crear tu cuenta. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-50 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold">Crear cuenta</h1>

        <p className="mt-4 font-semibold">¿Qué harás en encuentrame.bo?</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => toggleRole('buyer')}
            className={`rounded-xl border-2 p-4 text-center ${roles.includes('buyer') ? 'border-brand bg-teal-50' : 'border-gray-200'}`}
          >
            🛒<div className="font-semibold">Comprar</div>
          </button>
          <button
            type="button"
            onClick={() => toggleRole('seller')}
            className={`rounded-xl border-2 p-4 text-center ${roles.includes('seller') ? 'border-brand bg-teal-50' : 'border-gray-200'}`}
          >
            🏪<div className="font-semibold">Vender</div>
          </button>
        </div>

        <Button className="mt-6 w-full" disabled={busy} onClick={() => void register(true)}>
          Registrarme con Google
        </Button>

        <div className="my-4 text-center text-sm text-gray-400">— o con tu correo —</div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void register(false);
          }}
        >
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Contraseña (mínimo 8 caracteres)"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              Acepto los <a className="underline" href="/terminos">términos y condiciones</a> y la
              política de privacidad.
            </span>
          </label>
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            Crear cuenta
          </Button>
        </form>

        {error && <p className="mt-3 text-center text-red-600">{error}</p>}

        <p className="mt-4 text-center text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-dark underline">Ingresar</Link>
        </p>
      </Card>
    </main>
  );
}
