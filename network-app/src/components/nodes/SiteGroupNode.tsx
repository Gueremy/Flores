import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { SiteGroupData } from '../../types';

type SiteGroupNodeType = Node<SiteGroupData>;

const SITE_COLORS = [
  { bg: 'rgba(148,163,184,0.15)', border: '#94a3b8', text: '#64748b' },
  { bg: 'rgba(99,102,241,0.1)',   border: '#818cf8', text: '#6366f1' },
  { bg: 'rgba(16,185,129,0.1)',   border: '#34d399', text: '#10b981' },
  { bg: 'rgba(245,158,11,0.1)',   border: '#fbbf24', text: '#d97706' },
  { bg: 'rgba(239,68,68,0.1)',    border: '#f87171', text: '#ef4444' },
];

let colorIndex = 0;
const siteColorMap = new Map<string, (typeof SITE_COLORS)[0]>();

function getSiteColor(id: string) {
  if (!siteColorMap.has(id)) {
    siteColorMap.set(id, SITE_COLORS[colorIndex % SITE_COLORS.length]);
    colorIndex++;
  }
  return siteColorMap.get(id)!;
}

export function SiteGroupNode({ id, data, selected }: NodeProps<SiteGroupNodeType>) {
  const color = getSiteColor(id);
  return (
    <div
      className="w-full h-full rounded-2xl"
      style={{
        background: color.bg,
        border: `2px dashed ${selected ? '#60a5fa' : color.border}`,
        boxShadow: selected ? '0 0 0 2px #3b82f6' : undefined,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <NodeResizer
        minWidth={150}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: '#60a5fa' }}
        handleStyle={{ width: 10, height: 10, borderColor: '#60a5fa', background: '#1e293b' }}
      />
      <div
        className="absolute top-2 left-3 text-sm font-bold pointer-events-none select-none"
        style={{ color: color.text }}
      >
        {data.label}
      </div>
    </div>
  );
}
