import { CableEdge } from './CableEdge';
import { WirelessEdge } from './WirelessEdge';

export const edgeTypes = {
  cable: CableEdge,
  wireless: WirelessEdge,
} as const;
