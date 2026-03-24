import React from 'react';
import { Plus } from 'lucide-react';

interface NewTabButtonProps {
  onClick: () => void;
}

export function NewTabButton({ onClick }: NewTabButtonProps) {
  return (
    <div
      className="h-[36px] flex items-center px-1"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <button
        onClick={onClick}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-2 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ghana-gold/50"
        aria-label="New tab"
        title="New tab (Ctrl+T)"
      >
        <Plus
          size={15}
          className="text-text-muted hover:text-text-primary transition-colors duration-150"
        />
      </button>
    </div>
  );
}
