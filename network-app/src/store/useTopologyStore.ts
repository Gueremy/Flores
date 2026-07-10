import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react';
import { NodeData, SiteGroupData, NodeKind, TopologySnapshot } from '../types';
import { exampleNodes, exampleEdges } from '../data/exampleTopology';
import { saveToStorage, loadFromStorage } from '../utils/persistence';

type AddNodeKind = NodeKind | 'siteGroup';

interface TopologyState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (kind: AddNodeKind, position: XYPosition) => void;
  updateNodeData: (id: string, patch: Partial<NodeData> | Partial<SiteGroupData>) => void;
  deleteNode: (id: string) => void;
  setSelectedNode: (id: string | null) => void;

  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  importTopology: (snap: TopologySnapshot) => void;
  exportTopology: () => TopologySnapshot;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const NODE_LABELS: Record<AddNodeKind, string> = {
  isp: 'ISP / Satélite',
  router: 'Router',
  switch: 'Switch',
  antenna: 'Antena',
  client: 'Dispositivo',
  siteGroup: 'Nuevo Sitio',
};

export const useTopologyStore = create<TopologyState>()((set, get) => ({
  nodes: exampleNodes as Node[],
  edges: exampleEdges,
  selectedNodeId: null,

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) as Edge[] }),

  onConnect: (connection) =>
    set({
      edges: addEdge(
        { ...connection, type: 'cable', data: { kind: 'cable' as const } },
        get().edges
      ) as Edge[],
    }),

  addNode: (kind, position) => {
    const id = makeId(kind);
    const isSiteGroup = kind === 'siteGroup';
    const node: Node = isSiteGroup
      ? {
          id,
          type: 'siteGroup',
          position,
          data: { label: NODE_LABELS[kind] } as SiteGroupData,
          style: { width: 250, height: 180 },
          zIndex: -1,
        }
      : {
          id,
          type: kind,
          position,
          data: {
            label: NODE_LABELS[kind],
            nodeType: kind as NodeKind,
            site: '',
          } as NodeData,
          zIndex: 1,
        };
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  deleteNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id && n.parentId !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  saveToLocalStorage: () => {
    const { nodes, edges } = get();
    saveToStorage({ version: '1', nodes, edges });
  },

  loadFromLocalStorage: () => {
    const snap = loadFromStorage();
    if (snap) {
      set({ nodes: snap.nodes as Node[], edges: snap.edges, selectedNodeId: null });
      return true;
    }
    return false;
  },

  importTopology: (snap) =>
    set({ nodes: snap.nodes as Node[], edges: snap.edges, selectedNodeId: null }),

  exportTopology: () => {
    const { nodes, edges } = get();
    return { version: '1' as const, nodes, edges };
  },
}));
