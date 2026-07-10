import { useRef } from 'react';
import { useTopologyStore } from '../store/useTopologyStore';
import { downloadJSON, parseJSONFile, exportPNG } from '../utils/exportImport';
import { NodeKind, TopologySnapshot } from '../types';
import { type Severity } from '../utils/networkAnalysis';

type AddNodeKind = NodeKind | 'siteGroup';

interface NodeButton {
  kind: AddNodeKind;
  label: string;
  color: string;
}

const NODE_BUTTONS: NodeButton[] = [
  { kind: 'isp',       label: '+ ISP',      color: 'bg-sky-700 hover:bg-sky-600' },
  { kind: 'router',    label: '+ Router',   color: 'bg-indigo-700 hover:bg-indigo-600' },
  { kind: 'switch',    label: '+ Switch',   color: 'bg-violet-700 hover:bg-violet-600' },
  { kind: 'antenna',   label: '+ Antena',   color: 'bg-emerald-700 hover:bg-emerald-600' },
  { kind: 'client',    label: '+ Cliente',  color: 'bg-slate-600 hover:bg-slate-500' },
  { kind: 'siteGroup', label: '+ Sitio',    color: 'bg-slate-700 hover:bg-slate-600 border border-dashed border-slate-400' },
];

const SCORE_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  warning:  'text-amber-400',
  ok:       'text-emerald-400',
};

function scoreLevel(score: number): Severity {
  if (score >= 80) return 'ok';
  if (score >= 50) return 'warning';
  return 'critical';
}

export function Toolbar() {
  const store = useTopologyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const score = store.analysisResult?.score;

  const handleAddNode = (kind: AddNodeKind) => {
    store.addNode(kind, { x: 150 + Math.random() * 300, y: 150 + Math.random() * 150 });
  };

  const handleSave = () => {
    store.saveToLocalStorage();
    // brief visual feedback via title bar flash (cheap, no toast library needed)
    const orig = document.title;
    document.title = '✓ Guardado';
    setTimeout(() => { document.title = orig; }, 1500);
  };

  const handleLoad = () => {
    const loaded = store.loadFromLocalStorage();
    if (!loaded) alert('No hay topología guardada en este navegador.');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snap = await parseJSONFile(file);
      if (store.nodes.length > 0) {
        const combine = window.confirm(
          '¿Combinar con el mapa actual?\n\nAceptar = combinar sin duplicar\nCancelar = reemplazar todo el mapa'
        );
        if (combine) {
          const { added, updated } = store.mergeTopology(snap as TopologySnapshot);
          alert(`Combinado: ${added} nuevos, ${updated} actualizados.`);
        } else {
          store.importTopology(snap as TopologySnapshot);
        }
      } else {
        store.importTopology(snap as TopologySnapshot);
      }
    } catch {
      alert('Archivo inválido. Exportá un JSON de topología válido primero.');
    }
    e.target.value = '';
  };

  return (
    <header className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-slate-700 flex-wrap min-h-[44px]">
      <span className="text-[10px] font-bold text-slate-500 mr-1 uppercase tracking-wider shrink-0">
        Agregar
      </span>

      {NODE_BUTTONS.map(({ kind, label, color }) => (
        <button
          key={kind}
          onClick={() => handleAddNode(kind)}
          className={`px-2.5 py-1 rounded text-xs font-medium text-white transition-colors shrink-0 ${color}`}
        >
          {label}
        </button>
      ))}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Scan button */}
        <button
          onClick={() => store.setShowScanModal(true)}
          className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors shadow-lg shadow-emerald-900/40"
        >
          📡 Escanear
        </button>

        {/* Optimizer button */}
        <button
          onClick={store.runAnalysis}
          className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-900/40"
        >
          🧠 Analizar Red
          {score !== undefined && (
            <span className={`font-bold ${SCORE_COLOR[scoreLevel(score)]}`}>
              {score}%
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-0.5" />

        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Archivo
        </span>
        <button
          onClick={handleSave}
          title="Guardar en el navegador"
          className="px-2.5 py-1 rounded text-xs font-medium bg-green-700 hover:bg-green-600 text-white transition-colors"
        >
          💾 Guardar
        </button>
        <button
          onClick={handleLoad}
          title="Cargar desde el navegador"
          className="px-2.5 py-1 rounded text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white transition-colors"
        >
          ↩ Cargar
        </button>
        <button
          onClick={() => downloadJSON(store.exportTopology())}
          title="Exportar como archivo JSON"
          className="px-2.5 py-1 rounded text-xs font-medium bg-blue-700 hover:bg-blue-600 text-white transition-colors"
        >
          ↓ JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importar desde archivo JSON"
          className="px-2.5 py-1 rounded text-xs font-medium bg-amber-700 hover:bg-amber-600 text-white transition-colors"
        >
          ↑ Importar
        </button>
        <button
          onClick={() => void exportPNG()}
          title="Exportar como imagen PNG"
          className="px-2.5 py-1 rounded text-xs font-medium bg-rose-700 hover:bg-rose-600 text-white transition-colors"
        >
          🖼 PNG
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
    </header>
  );
}
