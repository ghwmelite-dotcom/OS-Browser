import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorPageProps {
  type: 'offline' | 'not-found' | 'blocked' | 'error';
  url?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorPage({ type, url, message, onRetry }: ErrorPageProps) {
  const configs = {
    offline: { icon: WifiOff, title: 'You are offline', desc: 'This page will load when you reconnect.', color: 'text-ghana-gold' },
    'not-found': { icon: AlertTriangle, title: 'Page not found', desc: `The page at ${url || 'this URL'} could not be found.`, color: 'text-ghana-red' },
    blocked: { icon: AlertTriangle, title: 'Content blocked', desc: 'This content was blocked by the ad blocker.', color: 'text-ghana-red' },
    error: { icon: AlertTriangle, title: 'Something went wrong', desc: message || 'An error occurred while loading this page.', color: 'text-ghana-red' },
  };

  const config = configs[type];

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <config.icon size={48} className={`${config.color} mx-auto mb-4`} />
        <h2 className="text-xl font-medium text-text-primary mb-2">{config.title}</h2>
        <p className="text-md text-text-secondary mb-6">{config.desc}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ghana-gold text-bg font-medium hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
