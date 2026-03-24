import React, { useEffect, useState } from 'react';

interface KenteSplashProps {
  onDone: () => void;
}

export function KenteSplash({ onDone }: KenteSplashProps) {
  const [phase, setPhase] = useState<'weave' | 'logo' | 'fade'>('weave');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'), 1200);
    const t2 = setTimeout(() => setPhase('fade'), 2800);
    const t3 = setTimeout(onDone, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#0f1117',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'fade' ? 0 : 1,
      transition: 'opacity 500ms ease-out',
    }}>
      {/* Animated Kente weave pattern */}
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ marginBottom: 24 }}>
        {/* Background circle */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="#D4A017" strokeWidth="2"
          strokeDasharray="566" strokeDashoffset={phase === 'weave' ? '566' : '0'}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />

        {/* Kente horizontal weave lines */}
        {[35, 55, 75, 95, 115, 135, 155].map((y, i) => (
          <line key={`h${i}`} x1="30" y1={y} x2="170" y2={y}
            stroke={['#D4A017', '#006B3F', '#CE1126', '#D4A017', '#006B3F', '#CE1126', '#D4A017'][i]}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray="140" strokeDashoffset={phase === 'weave' ? '140' : '0'}
            style={{ transition: `stroke-dashoffset 0.8s ease-out ${0.1 * i}s` }} />
        ))}

        {/* Kente vertical weave lines */}
        {[45, 65, 85, 105, 125, 145].map((x, i) => (
          <line key={`v${i}`} x1={x} y1="30" x2={x} y2="160"
            stroke={['#006B3F', '#D4A017', '#CE1126', '#006B3F', '#D4A017', '#CE1126'][i]}
            strokeWidth="4" strokeLinecap="round" opacity="0.6"
            strokeDasharray="130" strokeDashoffset={phase === 'weave' ? '130' : '0'}
            style={{ transition: `stroke-dashoffset 0.6s ease-out ${0.15 * i + 0.3}s` }} />
        ))}

        {/* Center compass/globe — same as desktop TitleBar logo */}
        <g style={{
          opacity: phase === 'logo' || phase === 'fade' ? 1 : 0,
          transform: phase === 'logo' || phase === 'fade' ? 'scale(1)' : 'scale(0.5)',
          transformOrigin: '100px 95px',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}>
          <circle cx="100" cy="95" r="28" fill="none" stroke="#D4A017" strokeWidth="2" />
          <path d="M100 69V80M100 110V121M74 95H85M115 95H126"
            stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="100" cy="95" rx="12" ry="28" fill="none" stroke="#F2C94C" strokeWidth="0.8" opacity="0.5" />
          <ellipse cx="100" cy="95" rx="28" ry="12" fill="none" stroke="#F2C94C" strokeWidth="0.8" opacity="0.5" />
          <circle cx="100" cy="95" r="5" fill="#D4A017">
            <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      {/* App name */}
      <div style={{
        opacity: phase === 'logo' || phase === 'fade' ? 1 : 0,
        transform: phase === 'logo' || phase === 'fade' ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease-out 0.2s, transform 0.5s ease-out 0.2s',
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#D4A017',
          letterSpacing: 2, textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          OS Browser
        </h1>
        <p style={{
          fontSize: 12, color: '#8b8d98', textAlign: 'center',
          marginTop: 6, letterSpacing: 1,
        }}>
          Ghana's AI-Powered Browser
        </p>
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex', gap: 6, marginTop: 32,
        opacity: phase === 'logo' ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#D4A017',
            animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
