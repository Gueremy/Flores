import { useTopologyStore } from '../store/useTopologyStore';
import { type Suggestion, type Severity } from '../utils/networkAnalysis';

const SEVERITY_CONFIG: Record<Severity, { icon: string; color: string; bg: string; border: string }> = {
  critical: {
    icon: '🔴',
    color: 'text-red-400',
    bg: 'bg-red-950/60',
    border: 'border-red-700',
  },
  warning: {
    icon: '🟡',
    color: 'text-amber-400',
    bg: 'bg-amber-950/60',
    border: 'border-amber-700',
  },
  ok: {
    icon: '🟢',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-700',
  },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Aceptable' : score >= 40 ? 'Mejorable' : 'Crítico';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#334155" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="relative -mt-[68px] flex flex-col items-center pointer-events-none">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-slate-400">/100</span>
      </div>
      <div className="mt-10">
        <span
          className="px-3 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: color + '33', color }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color = 'text-slate-300' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center p-2 bg-slate-700/50 rounded-lg min-w-[60px]">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-[9px] text-slate-500 text-center leading-tight mt-0.5">{label}</span>
    </div>
  );
}

function SuggestionCard({
  s,
  onHighlight,
}: {
  s: Suggestion;
  onHighlight: (ids: string[]) => void;
}) {
  const cfg = SEVERITY_CONFIG[s.severity];
  return (
    <div className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${cfg.color} leading-snug`}>{s.title}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.description}</p>
          {s.affectedNodeIds.length > 0 && (
            <button
              onClick={() => onHighlight(s.affectedNodeIds)}
              className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Ver en mapa →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OptimizerPanel() {
  const { analysisResult, showOptimizer, runAnalysis, toggleOptimizer, setSelectedNode } =
    useTopologyStore();

  if (!showOptimizer) return null;

  const handleHighlight = (ids: string[]) => {
    if (ids.length > 0) setSelectedNode(ids[0]);
  };

  const criticals = analysisResult?.suggestions.filter((s) => s.severity === 'critical') ?? [];
  const warnings  = analysisResult?.suggestions.filter((s) => s.severity === 'warning') ?? [];
  const oks       = analysisResult?.suggestions.filter((s) => s.severity === 'ok') ?? [];

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-sm font-semibold text-white">Optimizador de Red</span>
        </div>
        <button
          onClick={toggleOptimizer}
          className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {!analysisResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="text-5xl">🔍</div>
            <p className="text-sm text-slate-300 font-medium">
              Analizá tu topología para detectar puntos débiles y mejorar la resiliencia
            </p>
            <p className="text-xs text-slate-500">
              El sistema detecta puntos únicos de falla, sobrecargas, nodos aislados y cadenas inalámbricas largas
            </p>
            <button
              onClick={runAnalysis}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/40"
            >
              Analizar ahora
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {/* Score */}
            <ScoreRing score={analysisResult.score} />

            {/* Stats grid */}
            <div className="flex flex-wrap justify-center gap-2 px-1">
              <StatBadge label="Dispositivos" value={analysisResult.stats.totalDevices} />
              <StatBadge
                label="SPOFs"
                value={analysisResult.stats.spofCount}
                color={analysisResult.stats.spofCount > 0 ? 'text-red-400' : 'text-emerald-400'}
              />
              <StatBadge
                label="Aislados"
                value={analysisResult.stats.isolatedCount}
                color={analysisResult.stats.isolatedCount > 0 ? 'text-red-400' : 'text-emerald-400'}
              />
              <StatBadge label="Links cable" value={analysisResult.stats.wiredLinks} color="text-slate-300" />
              <StatBadge label="Links WiFi" value={analysisResult.stats.wirelessLinks} color="text-emerald-400" />
            </div>

            {/* Suggestions by severity */}
            {criticals.length > 0 && (
              <Section title={`Crítico (${criticals.length})`} color="text-red-400">
                {criticals.map((s) => (
                  <SuggestionCard key={s.id} s={s} onHighlight={handleHighlight} />
                ))}
              </Section>
            )}

            {warnings.length > 0 && (
              <Section title={`Advertencias (${warnings.length})`} color="text-amber-400">
                {warnings.map((s) => (
                  <SuggestionCard key={s.id} s={s} onHighlight={handleHighlight} />
                ))}
              </Section>
            )}

            {oks.length > 0 && (
              <Section title="Todo OK" color="text-emerald-400">
                {oks.map((s) => (
                  <SuggestionCard key={s.id} s={s} onHighlight={handleHighlight} />
                ))}
              </Section>
            )}

            {analysisResult.suggestions.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-semibold text-emerald-400">¡Red óptima!</p>
                <p className="text-xs text-slate-500">No se detectaron problemas.</p>
              </div>
            )}

            {/* Re-analyze */}
            <button
              onClick={runAnalysis}
              className="mx-3 mb-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-600"
            >
              ↻ Volver a analizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${color} px-1`}>
        {title}
      </span>
      {children}
    </div>
  );
}
