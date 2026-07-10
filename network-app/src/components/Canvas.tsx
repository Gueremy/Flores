import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
} from '@xyflow/react';
import { useTopologyStore } from '../store/useTopologyStore';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';

const NODE_COLORS: Record<string, string> = {
  isp: '#0ea5e9',
  router: '#6366f1',
  switch: '#8b5cf6',
  antenna: '#10b981',
  client: '#64748b',
  siteGroup: '#94a3b8',
};

export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
  } = useTopologyStore();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: 0.12 }}
        defaultEdgeOptions={{ type: 'cable', data: { kind: 'cable' } }}
        elevateNodesOnSelect={false}
        minZoom={0.15}
        maxZoom={3}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls className="!border-slate-700 !bg-slate-800 !shadow-xl [&>button]:!bg-slate-800 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700 [&>button]:!border-slate-700" />
        <MiniMap
          className="!bg-slate-800 !border-slate-700"
          nodeColor={(n) => NODE_COLORS[n.type ?? 'client'] ?? '#64748b'}
          maskColor="rgba(15,23,42,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
