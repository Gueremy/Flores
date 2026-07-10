import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      <Toolbar />
      <ReactFlowProvider>
        <div className="flex flex-1 overflow-hidden">
          <Canvas />
          <SidePanel />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
