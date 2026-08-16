import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-brand-dark">encuentrame.bo</span>
        <Link to="/login" className="btn rounded-xl px-4 py-2 font-semibold text-brand-dark">
          Ingresar
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          El mapa vivo del <span className="text-brand">comercio boliviano</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Miles de puestos y ferias que cambian de lugar cada día, ahora visibles en tiempo real.
          Una foto abre tu puesto. Tu voz registra tu inventario. Sin fricción, sin teclado.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/mapa">
            <Button>🔎 Buscar cerca de mí</Button>
          </Link>
          <Link to="/registro">
            <Button variant="secondary">🏪 Soy vendedor</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:grid-cols-3">
        {[
          ['📸', 'Una foto = abierto', 'La IA verifica tu puesto y te pone en el mapa al instante.'],
          ['🎙️', 'Tu voz es tu inventario', 'Dicta tus productos como un audio de WhatsApp. Nosotros hacemos el resto.'],
          ['🗺️', 'Encuentra al instante', 'Busca productos, categorías o caseras por nombre, justo donde estás.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            <div className="text-4xl">{icon}</div>
            <h3 className="mt-3 text-lg font-bold">{title}</h3>
            <p className="mt-1 text-gray-600">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-500">
        encuentrame.bo — Ningún negocio es demasiado pequeño para ser encontrado.
      </footer>
    </main>
  );
}
