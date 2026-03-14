import React from 'react';

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] px-3 py-2 rounded-card bg-ghana-gold/15 border border-ghana-gold/20 text-md text-text-primary">
        {content}
      </div>
    </div>
  );
}
