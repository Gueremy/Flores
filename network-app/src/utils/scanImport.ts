import { type Node, type Edge } from '@xyflow/react';
import { TopologySnapshot, NodeData } from '../types';

const VALID_NODE_TYPES = ['isp', 'router', 'switch', 'antenna', 'client', 'siteGroup'];
const VALID_EDGE_TYPES = ['cable', 'wireless'];

/**
 * Normaliza un snapshot importado (de un escaneo o de un export previo):
 * corrige tipos inválidos y descarta entradas malformadas sin romper.
 */
export function normalizeSnapshot(raw: TopologySnapshot): TopologySnapshot {
  const nodes = (raw.nodes ?? [])
    .filter((n) => n && typeof n.id === 'string' && n.position)
    .map((n) => ({
      ...n,
      type: VALID_NODE_TYPES.includes(n.type ?? '') ? n.type : 'client',
      position: {
        x: Number(n.position.x) || 0,
        y: Number(n.position.y) || 0,
      },
      data: {
        label: String((n.data as NodeData)?.label ?? n.id),
        ...(n.data as object),
      },
    })) as Node[];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = (raw.edges ?? [])
    .filter(
      (e) =>
        e &&
        typeof e.source === 'string' &&
        typeof e.target === 'string' &&
        nodeIds.has(e.source) &&
        nodeIds.has(e.target)
    )
    .map((e) => ({
      ...e,
      id: e.id ?? `e-${e.source}-${e.target}`,
      type: VALID_EDGE_TYPES.includes(e.type ?? '') ? e.type : 'cable',
      data: e.data ?? { kind: 'cable' },
    })) as Edge[];

  return { version: '1', nodes, edges };
}

function getIp(n: Node): string {
  return String((n.data as NodeData)?.ip ?? '').trim();
}

function edgePairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/**
 * Combina un snapshot entrante (ej. escaneo de otra casa) con la topología
 * actual sin duplicar:
 * - Nodos con la misma IP (o mismo id) se actualizan en lugar de duplicarse.
 * - Nodos nuevos se agregan desplazados a la derecha del mapa actual.
 * - Edges nuevos solo se agregan si no existe ya un enlace entre ese par.
 */
export function mergeSnapshots(
  currentNodes: Node[],
  currentEdges: Edge[],
  incoming: TopologySnapshot
): { nodes: Node[]; edges: Edge[]; added: number; updated: number } {
  const normalized = normalizeSnapshot(incoming);

  // Índices de la topología actual
  const byId = new Map(currentNodes.map((n) => [n.id, n]));
  const byIp = new Map<string, Node>();
  for (const n of currentNodes) {
    const ip = getIp(n);
    if (ip) byIp.set(ip, n);
  }

  // Offset para ubicar nodos nuevos en zona libre (a la derecha del mapa actual)
  const maxX = currentNodes.reduce((mx, n) => Math.max(mx, n.position.x), 0);
  const offsetX = currentNodes.length > 0 ? maxX + 250 : 0;

  // Mapa de id entrante → id final (para remapear edges)
  const idMap = new Map<string, string>();
  const mergedNodes = [...currentNodes];
  let added = 0;
  let updated = 0;

  for (const inNode of normalized.nodes) {
    const inIp = getIp(inNode);
    const match =
      byId.get(inNode.id) ?? (inIp ? byIp.get(inIp) : undefined);

    if (match) {
      // Actualizar datos del nodo existente (posición y label del usuario se respetan)
      idMap.set(inNode.id, match.id);
      const idx = mergedNodes.findIndex((n) => n.id === match.id);
      const existingData = mergedNodes[idx].data as NodeData;
      const incomingData = inNode.data as NodeData;
      mergedNodes[idx] = {
        ...mergedNodes[idx],
        data: {
          ...existingData,
          // Completar campos vacíos con lo escaneado, sin pisar lo editado a mano
          ip: existingData.ip || incomingData.ip,
          brand: existingData.brand || incomingData.brand,
          notes: existingData.notes || incomingData.notes,
        },
      };
      updated++;
    } else {
      idMap.set(inNode.id, inNode.id);
      mergedNodes.push({
        ...inNode,
        position: {
          x: inNode.position.x + offsetX,
          y: inNode.position.y,
        },
      });
      added++;
    }
  }

  // Edges: agregar solo pares nuevos
  const existingPairs = new Set(
    currentEdges.map((e) => edgePairKey(e.source, e.target))
  );
  const mergedEdges = [...currentEdges];

  for (const inEdge of normalized.edges) {
    const src = idMap.get(inEdge.source) ?? inEdge.source;
    const tgt = idMap.get(inEdge.target) ?? inEdge.target;
    const key = edgePairKey(src, tgt);
    if (existingPairs.has(key)) continue;
    existingPairs.add(key);
    mergedEdges.push({
      ...inEdge,
      id: `merged-${key}-${Date.now().toString(36)}`,
      source: src,
      target: tgt,
    });
  }

  return { nodes: mergedNodes, edges: mergedEdges, added, updated };
}
