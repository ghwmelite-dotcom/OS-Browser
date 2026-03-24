import { create } from 'zustand';

// ── Currency metadata ──────────────────────────────────────────────
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'CNY', symbol: '\u00A5', name: 'Chinese Yuan' },
  { code: 'NGN', symbol: '\u20A6', name: 'Nigerian Naira' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export const GHS_INFO: CurrencyInfo = { code: 'GHS', symbol: 'GH\u20B5', name: 'Ghana Cedi' };

// ── API base URL ──────────────────────────────────────────────────
const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev';

// ── Store interface ────────────────────────────────────────────────
interface ExchangeState {
  /** Rates: how many GHS per 1 unit of foreign currency. e.g. USD: 16.50 */
  rates: Record<string, number>;
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
  overlayEnabled: boolean;
  miniConverterOpen: boolean;
  miniConverterCurrency: string;

  fetchRates: () => Promise<void>;
  toggleOverlay: () => void;
  setOverlayEnabled: (enabled: boolean) => void;
  openMiniConverter: (currency?: string) => void;
  closeMiniConverter: () => void;
  convert: (amount: number, fromCurrency: string) => number;
  convertFromGhs: (amount: number, toCurrency: string) => number;
}

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  rates: {},
  lastUpdated: '',
  isLoading: false,
  error: null,
  overlayEnabled: false,
  miniConverterOpen: false,
  miniConverterCurrency: 'USD',

  fetchRates: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/v1/exchange/rates`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        rates: Record<string, number>;
        base: string;
        updated_at: string;
      };

      set({
        rates: data.rates,
        lastUpdated: data.updated_at,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[Exchange] Failed to fetch rates:', err);
      set({
        isLoading: false,
        error: err.message || 'Failed to fetch rates',
      });
    }
  },

  toggleOverlay: () => {
    const enabled = !get().overlayEnabled;
    set({ overlayEnabled: enabled });
    // Dispatch event for main process to inject/remove content script
    window.dispatchEvent(
      new CustomEvent('exchange:overlay-toggle', { detail: { enabled } }),
    );
  },

  setOverlayEnabled: (enabled: boolean) => {
    set({ overlayEnabled: enabled });
    window.dispatchEvent(
      new CustomEvent('exchange:overlay-toggle', { detail: { enabled } }),
    );
  },

  openMiniConverter: (currency?: string) => {
    set({
      miniConverterOpen: true,
      miniConverterCurrency: currency || get().miniConverterCurrency,
    });
  },

  closeMiniConverter: () => set({ miniConverterOpen: false }),

  /** Convert foreign currency amount to GHS */
  convert: (amount: number, fromCurrency: string): number => {
    const rate = get().rates[fromCurrency];
    if (!rate || rate <= 0) return 0;
    return Math.round(amount * rate * 100) / 100;
  },

  /** Convert GHS amount to foreign currency */
  convertFromGhs: (amount: number, toCurrency: string): number => {
    const rate = get().rates[toCurrency];
    if (!rate || rate <= 0) return 0;
    return Math.round((amount / rate) * 100) / 100;
  },
}));
