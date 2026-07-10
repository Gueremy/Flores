import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NodeData } from '../../types';
import { SwitchIcon } from '../icons';

type SwitchNodeType = Node<NodeData>;

export function SwitchNode({ data, selected }: NodeProps<SwitchNodeType>) {
  return (
    <div className={`
      flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 bg-white shadow-md
      min-w-[90px] cursor-pointer select-none transition-all
      ${selected ? 'border-violet-500 shadow-violet-300 shadow-lg' : 'border-violet-300'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-violet-400" />
      <Handle type="target" position={Position.Left} id="left-in" className="!w-3 !h-3 !bg-violet-400" />
      <div className="text-violet-500"><SwitchIcon /></div>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight max-w-[120px] truncate">
        {data.label}
      </span>
      {data.ip && (
        <span className="text-[10px] text-gray-400 font-mono">{data.ip}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-violet-400" />
      <Handle type="source" position={Position.Right} id="right-out" className="!w-3 !h-3 !bg-violet-400" />
    </div>
  );
}
