import { useEffect, useState } from 'react';
import { useTopologyStore } from '../store/useTopologyStore';
import { NodeData, SiteGroupData } from '../types';

type PanelData = Partial<NodeData> & Partial<SiteGroupData>;

export function SidePanel() {
  const { nodes, selectedNodeId, updateNodeData, deleteNode, setSelectedNode } =
    useTopologyStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const isSiteGroup = selectedNode?.type === 'siteGroup';
  const rawData = selectedNode?.data as PanelData | undefined;

  const [form, setForm] = useState<PanelData>({});

  useEffect(() => {
    if (rawData) setForm({ ...rawData });
    else setForm({});
  // Reset form when selection changes (intentionally omitting rawData from deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  if (!selectedNodeId || !rawData) return null;

  const handleChange = (field: keyof PanelData, value: string) => {
    const patch = { [field]: value } as PanelData;
    setForm((prev) => ({ ...prev, ...patch }));
    updateNodeData(selectedNodeId, patch);
  };

  return (
    <aside className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-white">
          {isSiteGroup ? '📍 Sitio' : '🔧 Propiedades'}
        </span>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
          aria-label="Cerrar panel"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1">
        <Field
          label="Nombre"
          value={(form.label as string) ?? ''}
          placeholder="ej. Router Principal"
          onChange={(v) => handleChange('label', v)}
        />

        {!isSiteGroup && (
          <>
            <Field
              label="Sitio / Ubicación"
              value={(form.site as string) ?? ''}
              placeholder="ej. Casa 1"
              onChange={(v) => handleChange('site', v)}
            />
            <Field
              label="Marca"
              value={(form.brand as string) ?? ''}
              placeholder="ej. Ubiquiti"
              onChange={(v) => handleChange('brand', v)}
            />
            <Field
              label="Modelo"
              value={(form.model as string) ?? ''}
              placeholder="ej. EdgeRouter 4"
              onChange={(v) => handleChange('model', v)}
            />
            <Field
              label="Dirección IP"
              value={(form.ip as string) ?? ''}
              placeholder="ej. 192.168.1.1"
              onChange={(v) => handleChange('ip', v)}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Notas
              </span>
              <textarea
                value={(form.notes as string) ?? ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                placeholder="Notas adicionales..."
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              />
            </label>

            {/* Connection type badge */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Tipo</span>
              <div className="mt-1 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-700 text-slate-300">
                  {(rawData as NodeData).nodeType ?? '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <div className="p-4 border-t border-slate-700 shrink-0">
        <button
          onClick={() => deleteNode(selectedNodeId)}
          className="w-full px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
        >
          Eliminar {isSiteGroup ? 'sitio' : 'nodo'}
        </button>
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </label>
  );
}
