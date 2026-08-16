import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { encodeGeohash, GEO_TILE_PRECISION, type SearchResultItem } from '@encuentrame/shared';
import { api } from '../../services/api-client';

/** Estilo raster OSM: costo $0 en tiles. Migrable a Protomaps/vector sin tocar la UI. */
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const LA_PAZ: [number, number] = [-68.15, -16.5];

function visibleTiles(map: MLMap): string[] {
  const b = map.getBounds();
  const tiles = new Set<string>();
  const latStep = (b.getNorth() - b.getSouth()) / 3;
  const lngStep = (b.getEast() - b.getWest()) / 3;
  for (let lat = b.getSouth(); lat <= b.getNorth(); lat += Math.max(latStep, 0.01)) {
    for (let lng = b.getWest(); lng <= b.getEast(); lng += Math.max(lngStep, 0.01)) {
      tiles.add(encodeGeohash(lat, lng, GEO_TILE_PRECISION));
    }
  }
  return [...tiles].slice(0, 12);
}

export function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [tiles, setTiles] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selected, setSelected] = useState<SearchResultItem | null>(null);

  // Inicialización del mapa + geolocalización del comprador
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: LA_PAZ,
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'bottom-right',
    );
    map.on('moveend', () => setTiles(visibleTiles(map)));
    map.on('load', () => setTiles(visibleTiles(map)));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Búsqueda contra meta-índices; refresco cada 60 s (stale-while-revalidate)
  const results = useQuery({
    queryKey: ['search', submitted, tiles],
    enabled: tiles.length > 0,
    refetchInterval: 60_000,
    queryFn: () => api.search({ q: submitted || undefined, tiles }),
  });

  // Render de marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = (results.data?.items ?? []).map((item) => {
      const el = document.createElement('button');
      el.className = 'rounded-full bg-brand text-white px-2 py-1 text-lg shadow-lg';
      el.textContent = '🏪';
      el.setAttribute('aria-label', item.stallName);
      el.onclick = () => setSelected(item);
      return new Marker({ element: el }).setLngLat([item.lng, item.lat]).addTo(map);
    });
  }, [results.data]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {/* Barra de búsqueda */}
      <form
        className="absolute left-0 right-0 top-0 z-10 flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <Link
          to="/"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-md"
          aria-label="Volver al inicio"
        >
          ←
        </Link>
        <input
          className="h-12 flex-1 rounded-xl bg-white px-4 shadow-md"
          placeholder="¿Qué buscas? (ej: api con pastel, costurera…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="h-12 rounded-xl bg-brand px-4 font-semibold text-white shadow-md" type="submit">
          Buscar
        </button>
      </form>

      {/* Contador de resultados */}
      <div className="absolute bottom-24 left-3 z-10 rounded-full bg-white px-4 py-2 text-sm shadow-md">
        {results.isFetching ? 'Buscando…' : `${results.data?.items.length ?? 0} puestos abiertos aquí`}
      </div>

      {/* Detalle del puesto seleccionado */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{selected.stallName}</h2>
              <p className="text-sm text-gray-500">Categoría: {selected.categoryId || 'general'} · Abierto hoy</p>
            </div>
            <button className="text-2xl text-gray-400" onClick={() => setSelected(null)} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <a
            className="mt-4 block rounded-xl bg-brand py-3 text-center font-semibold text-white"
            href={`https://www.openstreetmap.org/directions?to=${selected.lat},${selected.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            🧭 Cómo llegar
          </a>
        </div>
      )}
    </main>
  );
}
