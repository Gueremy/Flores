import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NodeData } from '../../types';
import { ClientIcon } from '../icons';

type ClientNodeType = Node<NodeData>;

export function ClientNode({ data, selected }: NodeProps<ClientNodeType>) {
  return (
    <div className={`
      flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 bg-white shadow-md
      min-w-[90px] cursor-pointer select-none transition-all
      ${selected ? 'border-slate-500 shadow-slate-300 shadow-lg' : 'border-slate-300'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left-in" className="!w-3 !h-3 !bg-slate-400" />
      <div className="text-slate-500"><ClientIcon /></div>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight max-w-[120px] truncate">
        {data.label}
      </span>
      {data.ip && (
        <span className="text-[10px] text-gray-400 font-mono">{data.ip}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400" />
    </div>
  );
}
