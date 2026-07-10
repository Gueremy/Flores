import { useTopologyStore } from '../../store/useTopologyStore';
import { type Severity } from '../../utils/networkAnalysis';

const DOT: Record<Severity, string> = {
  critical: 'bg-red-500 shadow-red-500/60',
  warning:  'bg-amber-400 shadow-amber-400/60',
  ok:       'bg-emerald-500 shadow-emerald-500/60',
};

export function SeverityBadge({ nodeId }: { nodeId: string }) {
  const result = useTopologyStore((s) => s.analysisResult);
  if (!result) return null;

  const sev = result.nodeSeverities[nodeId];
  if (!sev || sev.level === 'ok') return null;

  return (
    <span
      className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full shadow-lg ${DOT[sev.level]} ring-1 ring-slate-900`}
      title={sev.reasons.join(' · ')}
    />
  );
}
