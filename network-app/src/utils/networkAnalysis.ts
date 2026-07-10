import { Node, Edge } from '@xyflow/react';

export type Severity = 'critical' | 'warning' | 'ok';

export interface Suggestion {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  affectedNodeIds: string[];
}

export interface NodeSeverity {
  level: Severity;
  reasons: string[];
}

export interface AnalysisResult {
  score: number; // 0–100
  nodeSeverities: Record<string, NodeSeverity>;
  suggestions: Suggestion[];
  stats: {
    totalDevices: number;
    wirelessClients: number;
    wiredLinks: number;
    wirelessLinks: number;
    spofCount: number;
    isolatedCount: number;
  };
}

// ─── Graph helpers ────────────────────────────────────────────────────────────

function buildAdjacency(nodeIds: string[], edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source);
    }
  }
  return adj;
}

/** Articulation points (nodes whose removal disconnects the graph). */
function findArticulationPoints(nodeIds: string[], adj: Map<string, string[]>): Set<string> {
  const disc = new Map<string, number>();
  const low  = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const ap = new Set<string>();
  let timer = 0;

  function dfs(u: string) {
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    let children = 0;

    for (const v of adj.get(u) ?? []) {
      if (!disc.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        // Root with 2+ children in DFS tree → articulation point
        if (parent.get(u) == null && children > 1) ap.add(u);
        // Non-root where low[v] >= disc[u] → articulation point
        if (parent.get(u) != null && low.get(v)! >= disc.get(u)!) ap.add(u);
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const id of nodeIds) {
    if (!disc.has(id)) {
      parent.set(id, null);
      dfs(id);
    }
  }
  return ap;
}

/** BFS reachability from a source node. */
function reachableFrom(source: string, adj: Map<string, string[]>): Set<string> {
  const visited = new Set<string>([source]);
  const queue = [source];
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? []) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }
  return visited;
}

/** Count consecutive wireless hops from a node toward the ISP (upward path). */
function wirelessHopDepth(
  nodeId: string,
  adj: Map<string, string[]>,
  edgeKindMap: Map<string, 'cable' | 'wireless'>,
  ispIds: Set<string>,
  visited = new Set<string>()
): number {
  if (ispIds.has(nodeId) || visited.has(nodeId)) return 0;
  visited.add(nodeId);
  let max = 0;
  for (const neighbor of adj.get(nodeId) ?? []) {
    const key = [nodeId, neighbor].sort().join('|');
    if (edgeKindMap.get(key) === 'wireless') {
      max = Math.max(max, 1 + wirelessHopDepth(neighbor, adj, edgeKindMap, ispIds, visited));
    }
  }
  return max;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyzeTopology(nodes: Node[], edges: Edge[]): AnalysisResult {
  // Filter out site group nodes — they're visual containers, not network devices
  const deviceNodes = nodes.filter((n) => n.type !== 'siteGroup');
  const deviceIds   = deviceNodes.map((n) => n.id);
  const nodeById    = new Map(deviceNodes.map((n) => [n.id, n]));

  const adj = buildAdjacency(deviceIds, edges);

  // Edge kind map: "a|b" → 'cable' | 'wireless'
  const edgeKindMap = new Map<string, 'cable' | 'wireless'>();
  let wiredLinks = 0, wirelessLinks = 0;
  for (const e of edges) {
    const key = [e.source, e.target].sort().join('|');
    const kind = (e.data as { kind?: string })?.kind === 'wireless' ? 'wireless' : 'cable';
    edgeKindMap.set(key, kind);
    if (kind === 'wireless') wirelessLinks++;
    else wiredLinks++;
  }

  // ISP nodes (type === 'isp')
  const ispIds = new Set(deviceNodes.filter((n) => n.type === 'isp').map((n) => n.id));

  // Clients (type === 'client')
  const clientIds = new Set(deviceNodes.filter((n) => n.type === 'client').map((n) => n.id));

  // Antenna nodes
  const antennaIds = new Set(deviceNodes.filter((n) => n.type === 'antenna').map((n) => n.id));

  // ── Connectivity ──────────────────────────────────────────────────────────
  const firstIsp = [...ispIds][0] ?? '';
  const reachable = firstIsp ? reachableFrom(firstIsp, adj) : new Set<string>();
  const isolatedIds = deviceIds.filter((id) => !reachable.has(id) && id !== firstIsp);

  // ── Articulation points (SPOFs) ───────────────────────────────────────────
  const apSet = findArticulationPoints(deviceIds, adj);
  // An SPOF only matters if it's on the path between ISP and the rest of the network
  const spofIds = [...apSet].filter((id) => reachable.has(id));

  // ── Wireless clients per antenna ──────────────────────────────────────────
  const clientsPerAntenna = new Map<string, string[]>();
  for (const antennaId of antennaIds) {
    const wirelessClients: string[] = [];
    for (const neighbor of adj.get(antennaId) ?? []) {
      const key = [antennaId, neighbor].sort().join('|');
      if (edgeKindMap.get(key) === 'wireless') wirelessClients.push(neighbor);
    }
    clientsPerAntenna.set(antennaId, wirelessClients);
  }

  // ── Build per-node severities ─────────────────────────────────────────────
  const nodeSeverities: Record<string, NodeSeverity> = {};
  for (const id of deviceIds) {
    const reasons: string[] = [];
    let level: Severity = 'ok';

    if (!reachable.has(id) && id !== firstIsp) {
      level = 'critical';
      reasons.push('Sin conexión al internet (nodo aislado)');
    }
    if (spofIds.includes(id)) {
      level = 'critical';
      reasons.push('Punto único de falla — si cae, parte de la red se desconecta');
    }
    if (antennaIds.has(id)) {
      const wc = clientsPerAntenna.get(id) ?? [];
      if (wc.length > 15) {
        level = level === 'critical' ? 'critical' : 'warning';
        reasons.push(`Sobrecargada: ${wc.length} clientes WiFi (recomendado ≤ 15)`);
      } else if (wc.length > 8) {
        if (level === 'ok') level = 'warning';
        reasons.push(`Alta carga: ${wc.length} clientes WiFi`);
      }
    }

    nodeSeverities[id] = { level, reasons };
  }

  // ── Generate suggestions ──────────────────────────────────────────────────
  const suggestions: Suggestion[] = [];

  // 1. ISP redundancy
  if (ispIds.size === 0) {
    suggestions.push({
      id: 's-no-isp',
      severity: 'critical',
      title: 'Sin proveedor de internet definido',
      description: 'Agregá un nodo ISP (ej. Starlink) y conectalo al switch principal.',
      affectedNodeIds: [],
    });
  } else if (ispIds.size === 1) {
    suggestions.push({
      id: 's-single-isp',
      severity: 'warning',
      title: 'Sin redundancia de internet',
      description:
        'Solo tenés una conexión a internet (Starlink). Si falla la señal satelital, toda la red queda sin servicio. Considerá agregar un router 4G/LTE como backup y configurar failover automático.',
      affectedNodeIds: [...ispIds],
    });
  }

  // 2. SPOFs
  for (const id of spofIds) {
    const node = nodeById.get(id);
    const label = (node?.data as { label?: string })?.label ?? id;
    const type  = node?.type ?? '';
    let fix = '';
    if (type === 'switch') {
      fix = 'Agregá un segundo switch en paralelo y repartí las conexiones entre ambos.';
    } else if (type === 'router') {
      fix = 'Considerá agregar un enlace de backup (otro cable o antena) que evite depender solo de este router.';
    } else if (type === 'antenna') {
      fix = 'Agregá una segunda antena con cobertura solapada para que los clientes puedan hacer failover.';
    } else {
      fix = 'Agregá una ruta alternativa que no pase por este dispositivo.';
    }
    suggestions.push({
      id: `s-spof-${id}`,
      severity: 'critical',
      title: `"${label}" es un punto único de falla`,
      description: `Si este dispositivo falla, parte de la red queda sin internet. ${fix}`,
      affectedNodeIds: [id],
    });
  }

  // 3. Isolated nodes
  for (const id of isolatedIds) {
    const node  = nodeById.get(id);
    const label = (node?.data as { label?: string })?.label ?? id;
    suggestions.push({
      id: `s-isolated-${id}`,
      severity: 'critical',
      title: `"${label}" está desconectado`,
      description: 'Este nodo no tiene camino hacia el internet. Conectalo con un cable o link inalámbrico.',
      affectedNodeIds: [id],
    });
  }

  // 4. Overloaded antennas
  for (const [antennaId, clients] of clientsPerAntenna) {
    if (clients.length > 8) {
      const node  = nodeById.get(antennaId);
      const label = (node?.data as { label?: string })?.label ?? antennaId;
      suggestions.push({
        id: `s-overload-${antennaId}`,
        severity: clients.length > 15 ? 'critical' : 'warning',
        title: `"${label}" tiene ${clients.length} clientes WiFi`,
        description:
          `Con más de 8 clientes en la misma antena el rendimiento baja notablemente. ` +
          `Considerá dividirlos entre dos antenas o configurar una VLAN por casa/cabaña.`,
        affectedNodeIds: [antennaId, ...clients],
      });
    }
  }

  // 5. Wireless hop chain depth
  for (const id of deviceIds) {
    if (!antennaIds.has(id) && !clientIds.has(id)) continue;
    const depth = wirelessHopDepth(id, adj, edgeKindMap, ispIds);
    if (depth >= 3) {
      const node  = nodeById.get(id);
      const label = (node?.data as { label?: string })?.label ?? id;
      suggestions.push({
        id: `s-hops-${id}`,
        severity: 'warning',
        title: `"${label}" tiene ${depth} saltos inalámbricos`,
        description:
          `Cada salto inalámbrico reduce la velocidad y aumenta la latencia. Con ${depth} saltos en cadena la señal se degrada significativamente. Considerá tender un cable o usar un enlace PtP dedicado.`,
        affectedNodeIds: [id],
      });
    }
  }

  // 6. No redundant path to clients
  const nonRedundantClients = [...clientIds].filter(
    (id) => reachable.has(id) && !spofIds.some((sp) => adj.get(sp)?.includes(id))
  );
  if (clientIds.size > 0 && spofIds.length === 0 && nonRedundantClients.length === clientIds.size) {
    // All good — every path has at least one non-SPOF route (add a positive note)
    suggestions.push({
      id: 's-good-redundancy',
      severity: 'ok' as Severity,
      title: 'Todos los clientes tienen camino al internet',
      description: 'No se detectaron clientes aislados. ¡Buena cobertura!',
      affectedNodeIds: [],
    });
  }

  // 7. Network has no switches (flat topology warning)
  const switchIds = deviceNodes.filter((n) => n.type === 'switch').map((n) => n.id);
  if (switchIds.length === 0 && deviceNodes.length > 4) {
    suggestions.push({
      id: 's-no-switch',
      severity: 'warning',
      title: 'Red sin switch central',
      description:
        'Para redes con varios dispositivos, un switch mejora la gestión del tráfico y facilita agregar más equipos sin depender de los puertos del router.',
      affectedNodeIds: [],
    });
  }

  // ── Overall score ─────────────────────────────────────────────────────────
  let score = 100;
  score -= Math.min(spofIds.length * 25, 60);
  score -= Math.min(isolatedIds.length * 15, 30);
  if (ispIds.size === 1) score -= 10;
  if (ispIds.size === 0) score -= 30;
  for (const [, clients] of clientsPerAntenna) {
    if (clients.length > 15) score -= 15;
    else if (clients.length > 8) score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    nodeSeverities,
    suggestions: suggestions.filter((s) => s.severity !== 'ok').concat(
      suggestions.filter((s) => s.severity === 'ok')
    ),
    stats: {
      totalDevices: deviceIds.length,
      wirelessClients: clientIds.size,
      wiredLinks,
      wirelessLinks,
      spofCount: spofIds.length,
      isolatedCount: isolatedIds.length,
    },
  };
}
