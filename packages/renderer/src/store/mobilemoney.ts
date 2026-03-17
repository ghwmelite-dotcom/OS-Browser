import { create } from 'zustand';

export interface MoMoAccount {
  id: string;
  provider: 'mtn' | 'telecel' | 'at';
  phoneNumber: string;
  accountName: string;
  isDefault: boolean;
}

export interface PaymentReceipt {
  id: string;
  accountId: string;
  provider: 'mtn' | 'telecel' | 'at';
  amount: number; // in GH₵
  reference: string;
  description: string;
  recipient: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  url: string; // page where payment was made
}

export const PROVIDER_BRANDING = {
  mtn: { color: '#FFCB05', label: 'MTN MoMo', textColor: '#000' },
  telecel: { color: '#E31937', label: 'Telecel Cash', textColor: '#fff' },
  at: { color: '#0066B3', label: 'AirtelTigo Money', textColor: '#fff' },
} as const;

export interface MobileMoneyState {
  accounts: MoMoAccount[];
  receipts: PaymentReceipt[];
  monthlyBudget: number; // GH₵
  selectedMonth: string; // 'YYYY-MM'

  // Actions
  addAccount: (account: Omit<MoMoAccount, 'id'>) => void;
  removeAccount: (id: string) => void;
  setDefaultAccount: (id: string) => void;
  addReceipt: (receipt: Omit<PaymentReceipt, 'id'>) => void;
  removeReceipt: (id: string) => void;
  setMonthlyBudget: (amount: number) => void;
  setSelectedMonth: (month: string) => void;
  getMonthlyTotal: () => number;
  getMonthlyReceipts: () => PaymentReceipt[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ── Persistence ──────────────────────────────────────────────────────
const STORAGE_KEY = 'os-browser-mobile-money';

interface PersistedData {
  accounts: MoMoAccount[];
  receipts: PaymentReceipt[];
  monthlyBudget: number;
}

function loadPersistedData(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}

function persistData(state: MobileMoneyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accounts: state.accounts,
      receipts: state.receipts,
      monthlyBudget: state.monthlyBudget,
    }));
  } catch {
    // Storage full or unavailable
  }
}

// ── Initial data ─────────────────────────────────────────────────────
const persisted = loadPersistedData();
const currentMonth = new Date().toISOString().slice(0, 7);

export const useMobileMoneyStore = create<MobileMoneyState>((set, get) => ({
  accounts: persisted?.accounts ?? [],
  receipts: persisted?.receipts ?? [],
  monthlyBudget: persisted?.monthlyBudget ?? 2000,
  selectedMonth: currentMonth,

  addAccount: (account) =>
    set((state) => {
      const newState = {
        accounts: [
          ...state.accounts.map((a) =>
            account.isDefault ? { ...a, isDefault: false } : a
          ),
          { ...account, id: generateId() },
        ],
      };
      persistData({ ...state, ...newState });
      return newState;
    }),

  removeAccount: (id) =>
    set((state) => {
      const newState = { accounts: state.accounts.filter((a) => a.id !== id) };
      persistData({ ...state, ...newState });
      return newState;
    }),

  setDefaultAccount: (id) =>
    set((state) => {
      const newState = {
        accounts: state.accounts.map((a) => ({ ...a, isDefault: a.id === id })),
      };
      persistData({ ...state, ...newState });
      return newState;
    }),

  addReceipt: (receipt) =>
    set((state) => {
      const newState = {
        receipts: [{ ...receipt, id: generateId() }, ...state.receipts],
      };
      persistData({ ...state, ...newState });
      return newState;
    }),

  removeReceipt: (id) =>
    set((state) => {
      const newState = { receipts: state.receipts.filter((r) => r.id !== id) };
      persistData({ ...state, ...newState });
      return newState;
    }),

  setMonthlyBudget: (amount) =>
    set((state) => {
      persistData({ ...state, monthlyBudget: amount });
      return { monthlyBudget: amount };
    }),

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  getMonthlyTotal: () => {
    const { receipts, selectedMonth } = get();
    return receipts
      .filter((r) => {
        const d = new Date(r.timestamp);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === selectedMonth && r.status !== 'failed';
      })
      .reduce((sum, r) => sum + r.amount, 0);
  },

  getMonthlyReceipts: () => {
    const { receipts, selectedMonth } = get();
    return receipts
      .filter((r) => {
        const d = new Date(r.timestamp);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === selectedMonth;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  },
}));
