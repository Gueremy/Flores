export type NodeKind = 'isp' | 'router' | 'switch' | 'antenna' | 'client';
export type EdgeKind = 'cable' | 'wireless';

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeKind;
  site: string;
  brand?: string;
  model?: string;
  ip?: string;
  notes?: string;
}

export interface SiteGroupData extends Record<string, unknown> {
  label: string;
}

export interface EdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  label?: string;
}

export interface TopologySnapshot {
  version: '1';
  nodes: import('@xyflow/react').Node[];
  edges: import('@xyflow/react').Edge[];
}
