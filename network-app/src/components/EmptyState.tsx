import { useTopologyStore, exampleNodes, exampleEdges } from '../store/useTopologyStore';
import { type Node, type Edge } from '@xyflow/react';

const STEPS = [
  { icon: '1️⃣', text: 'Usá los botones de arriba para agregar cada dispositivo (ISP, Router, Switch, Antena, etc.)' },
  { icon: '2️⃣', text: 'Arrastrá los nodos para acomodarlos como están físicamente' },
  { icon: '3️⃣', text: 'Conectalos: arrastrá desde el borde de un nodo hasta otro (cable o inalámbrico según el tipo de conexión)' },
  { icon: '4️⃣', text: 'Hacé click en cada nodo para agregar nombre, IP, marca y notas' },
  { icon: '5️⃣', text: 'Cuando termines, guardá con 💾 o exportá como JSON/PNG' },
];

export function EmptyState() {
  const { nodes, importTopology } = useTopologyStore();

  if (nodes.length > 0) return null;

  const loadExample = () => {
    importTopology({
      version: '1',
      nodes: exampleNodes as Node[],
      edges: exampleEdges as Edge[],
    });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="pointer-events-auto bg-slate-800/95 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 flex flex-col gap-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🌐</div>
          <h2 className="text-lg font-bold text-white">Mapeá tu red</h2>
          <p className="text-sm text-slate-400 mt-1">
            Canvas vacío — empezá agregando tus dispositivos uno por uno
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {STEPS.map((step) => (
            <div key={step.icon} className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">{step.icon}</span>
              <p className="text-xs text-slate-300 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 pt-4 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">
            ¿Querés ver cómo se ve una red de ejemplo primero?
          </p>
          <button
            onClick={loadExample}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cargar red de ejemplo
          </button>
        </div>
      </div>
    </div>
  );
}
