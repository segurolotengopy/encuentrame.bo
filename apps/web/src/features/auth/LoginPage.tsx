import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { auth } from './useAuth';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      nav('/acceso');
    } catch {
      setError('No pudimos iniciar sesión. Verifica tus datos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-50 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center">Ingresar</h1>

        <Button className="mt-6 w-full" disabled={busy} onClick={() => withBusy(() => auth.loginGoogle())}>
          Continuar con Google
        </Button>

        <div className="my-4 text-center text-sm text-gray-400">— o con tu correo —</div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void withBusy(() => auth.loginEmail(email, password));
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
            placeholder="Contraseña"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            Ingresar
          </Button>
        </form>

        {error && <p className="mt-3 text-center text-red-600">{error}</p>}

        <div className="mt-4 flex justify-between text-sm">
          <button
            className="text-brand-dark underline"
            onClick={() => email && auth.resetPassword(email)}
          >
            Olvidé mi contraseña
          </button>
          <Link to="/registro" className="text-brand-dark underline">
            Crear cuenta
          </Link>
        </div>
      </Card>
    </main>
  );
}
