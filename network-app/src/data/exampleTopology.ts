import { Node, Edge } from '@xyflow/react';
import { NodeData, SiteGroupData, EdgeData } from '../types';

export const exampleNodes: Node<NodeData | SiteGroupData>[] = [
  // ── Site group nodes (render underneath device nodes) ─────────────────
  {
    id: 'site-principal',
    type: 'siteGroup',
    position: { x: 200, y: 20 },
    data: { label: 'Sitio Principal' } as SiteGroupData,
    style: { width: 280, height: 260 },
    zIndex: -1,
    selectable: true,
    draggable: true,
  },
  {
    id: 'site-casa1',
    type: 'siteGroup',
    position: { x: 20, y: 360 },
    data: { label: 'Casa 1' } as SiteGroupData,
    style: { width: 200, height: 180 },
    zIndex: -1,
    selectable: true,
    draggable: true,
  },
  {
    id: 'site-casa2',
    type: 'siteGroup',
    position: { x: 540, y: 360 },
    data: { label: 'Casa 2' } as SiteGroupData,
    style: { width: 260, height: 420 },
    zIndex: -1,
    selectable: true,
    draggable: true,
  },

  // ── Sitio Principal devices ───────────────────────────────────────────
  {
    id: 'starlink',
    type: 'isp',
    position: { x: 80, y: 60 },
    parentId: 'site-principal',
    extent: 'parent',
    data: {
      label: 'Starlink',
      nodeType: 'isp',
      site: 'Sitio Principal',
      brand: 'SpaceX',
      model: 'Starlink Gen3',
      notes: 'Antena satelital + router Starlink',
    } as NodeData,
    zIndex: 1,
  },
  {
    id: 'switch-main',
    type: 'switch',
    position: { x: 80, y: 160 },
    parentId: 'site-principal',
    extent: 'parent',
    data: {
      label: 'Switch Principal',
      nodeType: 'switch',
      site: 'Sitio Principal',
      notes: 'Switch central, distribuye a todas las casas',
    } as NodeData,
    zIndex: 1,
  },

  // ── Casa 1 devices ────────────────────────────────────────────────────
  {
    id: 'router-casa1',
    type: 'router',
    position: { x: 50, y: 60 },
    parentId: 'site-casa1',
    extent: 'parent',
    data: {
      label: 'Router Casa 1',
      nodeType: 'router',
      site: 'Casa 1',
    } as NodeData,
    zIndex: 1,
  },

  // ── Casa 2 devices ────────────────────────────────────────────────────
  {
    id: 'router-casa2',
    type: 'router',
    position: { x: 70, y: 60 },
    parentId: 'site-casa2',
    extent: 'parent',
    data: {
      label: 'Router Casa 2',
      nodeType: 'router',
      site: 'Casa 2',
    } as NodeData,
    zIndex: 1,
  },
  {
    id: 'antenna',
    type: 'antenna',
    position: { x: 70, y: 180 },
    parentId: 'site-casa2',
    extent: 'parent',
    data: {
      label: 'Antena Repetidora',
      nodeType: 'antenna',
      site: 'Casa 2',
      notes: 'Retransmite señal WiFi a cabañas vecinas',
    } as NodeData,
    zIndex: 1,
  },
  {
    id: 'client-1',
    type: 'client',
    position: { x: 20, y: 310 },
    parentId: 'site-casa2',
    extent: 'parent',
    data: {
      label: 'PC Cliente 1',
      nodeType: 'client',
      site: 'Casa 2',
    } as NodeData,
    zIndex: 1,
  },
  {
    id: 'client-2',
    type: 'client',
    position: { x: 150, y: 310 },
    parentId: 'site-casa2',
    extent: 'parent',
    data: {
      label: 'Laptop / Cabaña',
      nodeType: 'client',
      site: 'Casa 2',
    } as NodeData,
    zIndex: 1,
  },
];

export const exampleEdges: Edge<EdgeData>[] = [
  {
    id: 'e-starlink-switch',
    source: 'starlink',
    target: 'switch-main',
    type: 'cable',
    data: { kind: 'cable', label: 'Ethernet' },
  },
  {
    id: 'e-switch-router1',
    source: 'switch-main',
    target: 'router-casa1',
    type: 'cable',
    data: { kind: 'cable' },
  },
  {
    id: 'e-switch-router2',
    source: 'switch-main',
    target: 'router-casa2',
    type: 'cable',
    data: { kind: 'cable', label: 'Inter-casa' },
  },
  {
    id: 'e-router2-antenna',
    source: 'router-casa2',
    target: 'antenna',
    type: 'cable',
    data: { kind: 'cable' },
  },
  {
    id: 'e-antenna-client1',
    source: 'antenna',
    target: 'client-1',
    type: 'wireless',
    data: { kind: 'wireless', label: 'WiFi' },
  },
  {
    id: 'e-antenna-client2',
    source: 'antenna',
    target: 'client-2',
    type: 'wireless',
    data: { kind: 'wireless', label: 'WiFi' },
  },
];
