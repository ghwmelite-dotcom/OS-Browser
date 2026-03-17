import React, { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GAMES } from './GameCenterLayout';
import { SidebarPanelProps } from '@/features/registry';
import { useTabsStore } from '@/store/tabs';

// ── Component ────────────────────────────────────────────────────────
export const GovPlayQuickPanel: React.FC<SidebarPanelProps> = ({ onClose }) => {
  const lastPlayedGameId = useGameStore((s) => s.lastPlayedGameId);
  const stats = useGameStore((s) => s.stats);

  const lastGame = useMemo(
    () => GAMES.find((g) => g.id === lastPlayedGameId),
    [lastPlayedGameId],
  );

  const topPlayed = useMemo(() => {
    const entries = Object.entries(stats)
      .filter(([, s]) => s.played > 0)
      .sort(([, a], [, b]) => b.played - a.played)
      .slice(0, 3);
    return entries
      .map(([id]) => GAMES.find((g) => g.id === id))
      .filter(Boolean) as typeof GAMES;
  }, [stats]);

  const navigateToGame = (gameId: string) => {
    useTabsStore.getState().createTab('os-browser://games');
    // Small delay to let the tab load, then navigate to specific game
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('govplay:navigate', { detail: { view: 'game', gameId } }),
      );
    }, 100);
    onClose();
  };

  const openGovPlay = () => {
    useTabsStore.getState().createTab('os-browser://games');
    onClose();
  };

  // ── Styles ──────────────────────────────────────────────────────
  const panel: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1A1D27',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 16,
    gap: 20,
    overflow: 'auto',
  };

  const section: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(250,246,238,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const gameBtn = (highlight = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    border: highlight ? '1px solid rgba(252,209,22,0.25)' : '1px solid rgba(250,246,238,0.08)',
    background: highlight ? 'rgba(252,209,22,0.06)' : 'rgba(250,246,238,0.03)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#FAF6EE',
    textAlign: 'left',
    width: '100%',
  });

  const openBtn: React.CSSProperties = {
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #FCD116 0%, #D4A017 100%)',
    color: '#1A1D27',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    marginTop: 'auto',
  };

  return (
    <div style={panel}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        <span style={{ color: '#FCD116' }}>{'\u2726'}</span> GovPlay
      </div>

      {/* Continue Playing */}
      {lastGame && (
        <div style={section}>
          <div style={sectionTitle}>Continue playing</div>
          <button style={gameBtn(true)} onClick={() => navigateToGame(lastGame.id)}>
            <span style={{ fontSize: 22 }}>{lastGame.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{lastGame.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(250,246,238,0.5)' }}>
                {lastGame.description}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Quick Play */}
      {topPlayed.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>Quick play</div>
          {topPlayed.map((g) => (
            <button key={g.id} style={gameBtn()} onClick={() => navigateToGame(g.id)}>
              <span style={{ fontSize: 18 }}>{g.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(250,246,238,0.4)' }}>
                  {stats[g.id]?.played ?? 0} games played
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!lastGame && topPlayed.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'rgba(250,246,238,0.3)',
            fontSize: 13,
            padding: 24,
          }}
        >
          No games played yet. Open GovPlay to get started!
        </div>
      )}

      <button style={openBtn} onClick={openGovPlay}>
        Open GovPlay {'\u2192'}
      </button>
    </div>
  );
};
