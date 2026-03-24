import React from 'react';
import {
  FileText, Users, Calendar, BookOpen, Table, Mail,
  ListChecks, Scale, Languages, CheckSquare,
  X, Copy, Check, Loader2,
} from 'lucide-react';
import { useAIActionsStore } from '@/store/ai-actions';

const ICON_MAP: Record<string, any> = {
  FileText, Users, Calendar, BookOpen, Table, Mail,
  ListChecks, Scale, Languages, CheckSquare,
};

interface PageActionsMenuProps {
  pageContent: string;
  pageUrl: string;
  onClose: () => void;
}

function ResultPanel({ onClose }: { onClose: () => void }) {
  const { lastResult, isProcessing, activeAction, actions } = useAIActionsStore();
  const [copied, setCopied] = React.useState(false);

  const action = actions.find(a => a.id === activeAction);

  const handleCopy = async () => {
    if (!lastResult) return;
    try {
      await navigator.clipboard.writeText(lastResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) {
        return <h4 key={i} className="text-[13px] font-bold text-text-primary mt-3 mb-1">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={i} className="text-[14px] font-bold text-text-primary mt-3 mb-1">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={i} className="text-[15px] font-bold text-text-primary mt-3 mb-1">{trimmed.slice(2)}</h2>;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 text-[12px] text-text-secondary mb-1 pl-2">
            <span className="text-text-muted shrink-0 mt-0.5">-</span>
            <span>{renderInline(trimmed.slice(2))}</span>
          </div>
        );
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        return (
          <div key={i} className="flex gap-2 text-[12px] text-text-secondary mb-1 pl-2">
            <span className="text-text-muted shrink-0 font-medium w-4 text-right">{numMatch[1]}.</span>
            <span>{renderInline(numMatch[2])}</span>
          </div>
        );
      }

      // Empty line
      if (!trimmed) return <div key={i} className="h-2" />;

      // Regular paragraph
      return <p key={i} className="text-[12px] text-text-secondary mb-1">{renderInline(trimmed)}</p>;
    });
  };

  const renderInline = (text: string) => {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="absolute top-0 right-0 w-full h-full rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        {action && (() => {
          const Icon = ICON_MAP[action.icon];
          return Icon ? <Icon size={15} className="text-text-secondary" /> : null;
        })()}
        <span className="text-[13px] font-semibold text-text-primary flex-1">
          {action?.label || 'AI Result'}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
          title="Copy result"
        >
          {copied ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} className="text-text-muted" />
          )}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <X size={14} className="text-text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={24} className="text-text-muted animate-spin mb-3" />
            <span className="text-[12px] text-text-muted">Analyzing page content...</span>
          </div>
        ) : lastResult ? (
          renderContent(lastResult)
        ) : null}
      </div>
    </div>
  );
}

export function PageActionsMenu({ pageContent, pageUrl, onClose }: PageActionsMenuProps) {
  const { actions, executeAction, showResults, clearResult, isProcessing } = useAIActionsStore();

  const handleAction = async (actionId: string) => {
    await executeAction(actionId, pageContent, pageUrl);
  };

  const handleClose = () => {
    clearResult();
    onClose();
  };

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[400px] rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        maxHeight: '480px',
      }}
    >
      {showResults ? (
        <div className="relative" style={{ height: '380px' }}>
          <ResultPanel onClose={handleClose} />
        </div>
      ) : (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border-1)' }}
          >
            <span className="text-[13px] font-semibold text-text-primary">AI Page Actions</span>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <X size={14} className="text-text-muted" />
            </button>
          </div>

          {/* Action grid */}
          <div className="p-3 grid grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {actions.map(action => {
              const Icon = ICON_MAP[action.icon];
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={isProcessing}
                  className="flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--color-surface-1)',
                    borderColor: 'var(--color-border-1)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {Icon && (
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        <Icon size={13} className="text-text-secondary" />
                      </div>
                    )}
                    <span className="text-[12px] font-semibold text-text-primary">{action.label}</span>
                  </div>
                  <span className="text-[10px] text-text-muted leading-tight">{action.description}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
