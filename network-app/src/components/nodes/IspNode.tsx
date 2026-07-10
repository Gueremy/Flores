import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NodeData } from '../../types';
import { IspIcon } from '../icons';

type IspNodeType = Node<NodeData>;

export function IspNode({ data, selected }: NodeProps<IspNodeType>) {
  return (
    <div className={`
      flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 bg-white shadow-md
      min-w-[90px] cursor-pointer select-none transition-all
      ${selected ? 'border-sky-500 shadow-sky-300 shadow-lg' : 'border-sky-300'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-sky-400" />
      <div className="text-sky-500"><IspIcon /></div>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight max-w-[120px] truncate">
        {data.label}
      </span>
      {data.ip && (
        <span className="text-[10px] text-gray-400 font-mono">{data.ip}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-sky-400" />
      <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-sky-400" />
      <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-sky-400" />
    </div>
  );
}
