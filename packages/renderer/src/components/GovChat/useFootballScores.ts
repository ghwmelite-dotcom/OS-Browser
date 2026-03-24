import { useState, useEffect, useCallback, useRef } from 'react';
import type { FootballMatch } from './FootballScoreCard';

/* ─────────── Mock data (fallback when Worker is unreachable) ─────────── */

const MOCK_LIVE_MATCHES: FootballMatch[] = [
  {
    homeTeam: 'Hearts of Oak',
    awayTeam: 'Asante Kotoko',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    status: 'live',
    competition: 'Ghana Premier League',
    homeFlag: '\uD83C\uDDEC\uD83C\uDDED',
    awayFlag: '\uD83C\uDDEC\uD83C\uDDED',
    events: [
      { type: 'goal', team: 'home', player: 'D. Afriyie', minute: 14 },
      { type: 'goal', team: 'away', player: 'F. Baidoo', minute: 38 },
      { type: 'goal', team: 'home', player: 'K. Mensah', minute: 55 },
    ],
  },
  {
    homeTeam: 'Ghana',
    awayTeam: 'Nigeria',
    homeScore: 1,
    awayScore: 0,
    minute: 34,
    status: 'live',
    competition: 'AFCON 2026 Qualifier',
    homeFlag: '\uD83C\uDDEC\uD83C\uDDED',
    awayFlag: '\uD83C\uDDF3\uD83C\uDDEC',
    events: [
      { type: 'goal', team: 'home', player: 'M. Kudus', minute: 22 },
    ],
  },
  {
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeScore: 3,
    awayScore: 2,
    minute: 78,
    status: 'live',
    competition: 'Premier League',
    homeFlag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
    awayFlag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
    events: [
      { type: 'goal', team: 'home', player: 'T. Partey', minute: 12 },
      { type: 'goal', team: 'away', player: 'C. Palmer', minute: 25 },
      { type: 'goal', team: 'home', player: 'B. Saka', minute: 41 },
      { type: 'goal', team: 'away', player: 'N. Jackson', minute: 53 },
      { type: 'goal', team: 'home', player: 'M. Saliba', minute: 71 },
    ],
  },
  {
    homeTeam: 'Real Madrid',
    awayTeam: 'Bayern Munich',
    homeScore: 1,
    awayScore: 1,
    minute: 52,
    status: 'live',
    competition: 'Champions League',
    homeFlag: '\uD83C\uDDEA\uD83C\uDDF8',
    awayFlag: '\uD83C\uDDE9\uD83C\uDDEA',
    events: [
      { type: 'goal', team: 'home', player: 'V. Jr.', minute: 18 },
      { type: 'goal', team: 'away', player: 'H. Kane', minute: 44 },
    ],
  },
];

const MOCK_RECENT_RESULTS: FootballMatch[] = [
  {
    homeTeam: 'Aduana Stars',
    awayTeam: 'Medeama SC',
    homeScore: 0,
    awayScore: 2,
    minute: 90,
    status: 'ft',
    competition: 'Ghana Premier League',
    homeFlag: '\uD83C\uDDEC\uD83C\uDDED',
    awayFlag: '\uD83C\uDDEC\uD83C\uDDED',
    events: [
      { type: 'goal', team: 'away', player: 'A. Boateng', minute: 33 },
      { type: 'goal', team: 'away', player: 'E. Tetteh', minute: 76 },
    ],
  },
  {
    homeTeam: 'Black Stars',
    awayTeam: 'Ivory Coast',
    homeScore: 2,
    awayScore: 2,
    minute: 90,
    status: 'ft',
    competition: 'AFCON 2026 Qualifier',
    homeFlag: '\uD83C\uDDEC\uD83C\uDDED',
    awayFlag: '\uD83C\uDDE8\uD83C\uDDEE',
    events: [
      { type: 'goal', team: 'away', player: 'S. Haller', minute: 15 },
      { type: 'goal', team: 'home', player: 'J. Ayew', minute: 28 },
      { type: 'goal', team: 'home', player: 'M. Kudus', minute: 62 },
      { type: 'goal', team: 'away', player: 'N. Pepe', minute: 88 },
    ],
  },
  {
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    homeScore: 1,
    awayScore: 3,
    minute: 90,
    status: 'ft',
    competition: 'Premier League',
    homeFlag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
    awayFlag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
    events: [
      { type: 'goal', team: 'away', player: 'M. Salah', minute: 11 },
      { type: 'goal', team: 'home', player: 'E. Haaland', minute: 34 },
      { type: 'goal', team: 'away', player: 'D. Nunez', minute: 56 },
      { type: 'goal', team: 'away', player: 'M. Salah', minute: 79 },
    ],
  },
  {
    homeTeam: 'Barcelona',
    awayTeam: 'PSG',
    homeScore: 4,
    awayScore: 1,
    minute: 90,
    status: 'ft',
    competition: 'Champions League',
    homeFlag: '\uD83C\uDDEA\uD83C\uDDF8',
    awayFlag: '\uD83C\uDDEB\uD83C\uDDF7',
    events: [
      { type: 'goal', team: 'home', player: 'R. Lewandowski', minute: 8 },
      { type: 'goal', team: 'home', player: 'L. Yamal', minute: 23 },
      { type: 'goal', team: 'away', player: 'O. Dembele', minute: 40 },
      { type: 'goal', team: 'home', player: 'P. Gavi', minute: 67 },
      { type: 'goal', team: 'home', player: 'R. Lewandowski', minute: 82 },
    ],
  },
  {
    homeTeam: 'Atletico Madrid',
    awayTeam: 'Real Sociedad',
    homeScore: 2,
    awayScore: 0,
    minute: 90,
    status: 'ft',
    competition: 'La Liga',
    homeFlag: '\uD83C\uDDEA\uD83C\uDDF8',
    awayFlag: '\uD83C\uDDEA\uD83C\uDDF8',
    events: [
      { type: 'goal', team: 'home', player: 'A. Griezmann', minute: 29 },
      { type: 'goal', team: 'home', player: 'J. Alvarez', minute: 64 },
    ],
  },
  {
    homeTeam: 'Legon Cities',
    awayTeam: 'Dreams FC',
    homeScore: 1,
    awayScore: 3,
    minute: 90,
    status: 'ft',
    competition: 'Ghana Premier League',
    homeFlag: '\uD83C\uDDEC\uD83C\uDDED',
    awayFlag: '\uD83C\uDDEC\uD83C\uDDED',
    events: [
      { type: 'goal', team: 'away', player: 'I. Issahaku', minute: 17 },
      { type: 'goal', team: 'home', player: 'D. Sowah', minute: 45 },
      { type: 'goal', team: 'away', player: 'A. Kyeremateng', minute: 58 },
      { type: 'goal', team: 'away', player: 'I. Issahaku', minute: 74 },
    ],
  },
];

/* ─────────── Hook ─────────── */

const CACHE_DURATION_MS = 60_000; // 60 seconds

interface FootballCache {
  liveMatches: FootballMatch[];
  recentResults: FootballMatch[];
  fetchedAt: number;
}

let footballCache: FootballCache | null = null;

const WORKER_BASE = 'https://os-browser-worker.ghwmelite.workers.dev';

export function useFootballScores() {
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>([]);
  const [recentResults, setRecentResults] = useState<FootballMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchScores = useCallback(async () => {
    // Check cache first
    if (footballCache && Date.now() - footballCache.fetchedAt < CACHE_DURATION_MS) {
      setLiveMatches(footballCache.liveMatches);
      setRecentResults(footballCache.recentResults);
      setIsLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const [liveRes, recentRes] = await Promise.all([
        fetch(`${WORKER_BASE}/api/v1/govchat/football/live`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ matches: FootballMatch[] }>;
        }),
        fetch(`${WORKER_BASE}/api/v1/govchat/football/recent`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ matches: FootballMatch[] }>;
        }),
      ]);

      footballCache = {
        liveMatches: liveRes.matches,
        recentResults: recentRes.matches,
        fetchedAt: Date.now(),
      };

      setLiveMatches(liveRes.matches);
      setRecentResults(recentRes.matches);
    } catch (err) {
      console.warn('[useFootballScores] Worker fetch failed, using mock data:', err);
      setError('Using offline data');

      // Fall back to mock data
      footballCache = {
        liveMatches: MOCK_LIVE_MATCHES,
        recentResults: MOCK_RECENT_RESULTS,
        fetchedAt: Date.now(),
      };

      setLiveMatches(MOCK_LIVE_MATCHES);
      setRecentResults(MOCK_RECENT_RESULTS);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return { liveMatches, recentResults, isLoading, error, refetch: fetchScores };
}
