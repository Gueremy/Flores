import { useRef, useEffect } from 'react';
import { useTopologyStore } from '../store/useTopologyStore';
import { parseJSONFile } from '../utils/exportImport';

const BASE = import.meta.env.BASE_URL;

const STEPS = [
  {
    n: '1',
    title: 'Descargá el escáner',
    body: 'Elegí el botón según el sistema de la PC que esté conectada a tu red (no funciona desde el teléfono).',
  },
  {
    n: '2',
    title: 'Ejecutalo en esa PC',
    body: 'Windows: doble click en escanear-red.bat (descargá ambos archivos en la misma carpeta). Linux/Mac: abrí una terminal y corré "bash escanear-red.sh". Tarda menos de 1 minuto.',
  },
  {
    n: '3',
    title: 'Importá el resultado',
    body: 'El escáner genera "topologia-escaneada.json". Traelo a este dispositivo (WhatsApp, mail, pendrive) y usá el botón de abajo para importarlo — el mapa se arma solo.',
  },
];

export function ScanModal() {
  const { showScanModal, setShowScanModal, nodes, importTopology, mergeTopology } =
    useTopologyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showScanModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowScanModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showScanModal, setShowScanModal]);

  if (!showScanModal) return null;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snap = await parseJSONFile(file);
      if (nodes.length > 0) {
        const combine = window.confirm(
          '¿Combinar con el mapa actual?\n\nAceptar = combinar (agrega lo nuevo sin duplicar, ideal para escaneos de otras casas)\nCancelar = reemplazar todo el mapa'
        );
        if (combine) {
          const { added, updated } = mergeTopology(snap);
          alert(`Escaneo combinado: ${added} dispositivos nuevos, ${updated} actualizados.`);
        } else {
          importTopology(snap);
        }
      } else {
        importTopology(snap);
      }
      setShowScanModal(false);
    } catch {
      alert('Archivo inválido. Asegurate de elegir el "topologia-escaneada.json" que generó el escáner.');
    }
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setShowScanModal(false)}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <h2 className="text-base font-bold text-white">Escanear mi red</h2>
          </div>
          <button
            onClick={() => setShowScanModal(false)}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Why */}
          <p className="text-xs text-slate-400 leading-relaxed">
            El navegador no puede escanear la red por seguridad (ningún sitio web puede).
            Por eso el escaneo se hace con un pequeño programa que ejecutás una vez en una
            PC conectada a tu red: descubre el módem, la cadena de routers y todos los
            dispositivos conectados, y genera un archivo que importás acá.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Download buttons */}
          <div className="flex flex-col gap-2 bg-slate-900/60 rounded-xl p-4 border border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Descargar escáner
            </span>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${BASE}scanner/escanear-red.bat`}
                download
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                🪟 Windows (.bat)
              </a>
              <a
                href={`${BASE}scanner/escanear-red.ps1`}
                download
                className="px-3 py-1.5 bg-sky-800 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                🪟 Windows (.ps1)
              </a>
              <a
                href={`${BASE}scanner/escanear-red.sh`}
                download
                className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                🐧 Linux / Mac (.sh)
              </a>
              <a
                href={`${BASE}scanner/escanear-red-android.sh`}
                download
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                🤖 Android (Termux)
              </a>
            </div>
            <p className="text-[10px] text-slate-500">
              Windows: descargá el .bat y el .ps1 en la misma carpeta, después doble click al .bat.
              Android: requiere la app Termux (gratis, F-Droid) — mirá las instrucciones dentro del script.
            </p>
          </div>

          {/* Multi-house / multi-wifi note */}
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-3">
            <p className="text-[11px] text-emerald-300 leading-relaxed">
              <strong>💡 Para mapear TODA la red (varios routers/WiFis):</strong> cada
              router con su propia red (arrendatarios, cabaña, etc.) es una red separada e
              invisible desde las demás. Conectate a cada WiFi por turno (con la clave de
              esa red) y corré el escáner ahí también — la app combina todos los
              resultados en un solo mapa sin duplicar.
            </p>
          </div>

          <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-3">
            <p className="text-[11px] text-amber-300 leading-relaxed">
              <strong>📱 Con Android:</strong> por restricciones de seguridad del sistema,
              el escáner desde el teléfono no puede leer direcciones MAC ni el fabricante
              de cada equipo — solo la lista de IPs conectadas. Vas a ver "Dispositivo
              192.168.x.x" genéricos: hacé click en cada uno en el mapa y ponele el nombre
              real (router, antena, TV, etc.) según lo que sepas de tu instalación.
            </p>
          </div>

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-900/40"
          >
            ↑ Importar topologia-escaneada.json
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </div>
  );
}
