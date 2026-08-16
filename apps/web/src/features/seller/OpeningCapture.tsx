import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { useSession } from '../../stores/session';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { api } from '../../services/api-client';

/**
 * Apertura del puesto: UNA foto y listo.
 * 1) GPS del dispositivo  2) foto → Storage  3) POST /openings (idempotente)
 * La verificación IA corre asíncrona: el vendedor no espera.
 */
export function OpeningCapture() {
  const { stallId } = useParams<{ stallId: string }>();
  const { user } = useSession();
  const nav = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }),
    );
  }

  async function submit() {
    if (!file || !stallId || !user) return;
    setBusy(true);
    setError(null);
    try {
      setStep('Obteniendo tu ubicación…');
      const pos = await getPosition();

      setStep('Subiendo la foto…');
      const localDay = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
      const openingId = `${stallId}_${localDay}`;
      const photoPath = `openings/${user.uid}/${openingId}.jpg`;
      await uploadBytes(storageRef(storage, photoPath), file, { contentType: file.type });

      setStep('Registrando apertura…');
      await api.createOpening({
        stallId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        photoPath,
      });

      nav('/vendedor');
    } catch (e) {
      setError(
        e instanceof GeolocationPositionError
          ? 'No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.'
          : 'No pudimos registrar la apertura. Se reintentará cuando tengas señal.',
      );
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-bold">Abrir puesto</h1>
      <p className="mt-1 text-gray-600">Toma una foto de tu puesto tal como está ahora. Nada más.</p>

      <Card className="mt-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <img src={preview} alt="Foto del puesto" className="w-full rounded-xl" />
        ) : (
          <button
            className="flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-500"
            onClick={() => fileInput.current?.click()}
          >
            <span className="text-6xl">📸</span>
            <span className="mt-2 text-lg font-semibold">Tomar foto</span>
          </button>
        )}

        {preview && (
          <div className="mt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => onPick(null)} disabled={busy}>
              Repetir
            </Button>
            <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
              {busy ? (step ?? 'Enviando…') : '✅ Abrir mi puesto'}
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-center text-red-600">{error}</p>}
      </Card>

      <p className="mt-4 text-center text-sm text-gray-500">
        La IA verificará tu foto en segundos. Mientras tanto ya puedes seguir trabajando.
      </p>
    </main>
  );
}
