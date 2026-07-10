import { toPng } from 'html-to-image';
import { TopologySnapshot } from '../types';

export function downloadJSON(snapshot: TopologySnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `topology-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function parseJSONFile(file: File): Promise<TopologySnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target!.result as string);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          throw new Error('Invalid topology file');
        }
        resolve(data as TopologySnapshot);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function exportPNG(): Promise<void> {
  const el = document.querySelector<HTMLElement>('.react-flow');
  if (!el) return;
  try {
    const dataUrl = await toPng(el, { backgroundColor: '#0f172a', pixelRatio: 2 });
    Object.assign(document.createElement('a'), {
      href: dataUrl,
      download: 'network-topology.png',
    }).click();
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('PNG export failed. Try zooming to fit first.');
  }
}
