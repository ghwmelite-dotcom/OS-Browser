import React, { useEffect, useState } from 'react';
import { X, Globe } from 'lucide-react';

export function GovPortalsPanel({ onClose }: { onClose: () => void }) {
  const [portals, setPortals] = useState<any[]>([]);
  useEffect(() => { window.osBrowser.govPortals.list().then(setPortals); }, []);

  const toggleVisibility = async (id: number, visible: boolean) => {
    await window.osBrowser.govPortals.update(id, { is_visible: visible ? 1 : 0 });
    setPortals(await window.osBrowser.govPortals.list());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-16">
      <div className="w-[420px] bg-surface-1 border border-border-1 rounded-card shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
          <div className="flex items-center gap-2"><Globe size={16} className="text-ghana-gold" /><span className="text-md font-medium">Government Portals</span></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold"><X size={16} className="text-text-muted" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {portals.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-border-1 hover:bg-surface-2">
              <div><div className="text-sm text-text-primary">{p.name}</div><div className="text-xs text-text-muted">{p.url}</div></div>
              <span className="text-xs text-text-muted bg-surface-3 px-2 py-0.5 rounded">{p.category}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed inset-0 bg-black/50 -z-10" onClick={onClose} />
    </div>
  );
}
