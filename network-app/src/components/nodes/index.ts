import { IspNode } from './IspNode';
import { RouterNode } from './RouterNode';
import { SwitchNode } from './SwitchNode';
import { AntennaNode } from './AntennaNode';
import { ClientNode } from './ClientNode';
import { SiteGroupNode } from './SiteGroupNode';

export const nodeTypes = {
  isp: IspNode,
  router: RouterNode,
  switch: SwitchNode,
  antenna: AntennaNode,
  client: ClientNode,
  siteGroup: SiteGroupNode,
} as const;
