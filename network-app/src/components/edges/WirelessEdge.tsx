import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { EdgeData } from '../../types';

type WirelessEdgeType = Edge<EdgeData>;

export function WirelessEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<WirelessEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          strokeDasharray: '8 4',
          stroke: '#10b981',
          animation: 'wireless-dash 0.8s linear infinite',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}
          className="absolute nodrag nopan flex flex-col items-center gap-0.5 pointer-events-none"
        >
          <span className="text-emerald-500 text-sm leading-none">📶</span>
          {data?.label && (
            <span className="px-1 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-700 shadow-sm">
              {data.label}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
