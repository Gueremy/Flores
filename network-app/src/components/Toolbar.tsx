import { useRef } from 'react';
import { useTopologyStore } from '../store/useTopologyStore';
import { downloadJSON, parseJSONFile, exportPNG } from '../utils/exportImport';
import { NodeKind, TopologySnapshot } from '../types';

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

export function Toolbar() {
  const store = useTopologyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      store.importTopology(snap as TopologySnapshot);
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
