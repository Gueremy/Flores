import { TopologySnapshot } from '../types';

const KEY = 'network-topology-v1';

export function saveToStorage(snapshot: TopologySnapshot): void {
  localStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function loadFromStorage(): TopologySnapshot | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TopologySnapshot;
  } catch {
    return null;
  }
}
