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

// Sample data
const SAMPLE_ACCOUNT_ID = 'acct_mtn_001';

const sampleAccounts: MoMoAccount[] = [
  {
    id: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    phoneNumber: '0241234567',
    accountName: 'Kwame Asante',
    isDefault: true,
  },
];

const now = Date.now();
const DAY = 86400000;

const sampleReceipts: PaymentReceipt[] = [
  {
    id: 'rcpt_001',
    accountId: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    amount: 487.50,
    reference: 'SSNIT-2026-03-001',
    description: 'SSNIT Contribution',
    recipient: 'Social Security (SSNIT)',
    timestamp: now - 2 * DAY,
    status: 'completed',
    url: 'https://www.ssnit.org.gh/payments',
  },
  {
    id: 'rcpt_002',
    accountId: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    amount: 156.30,
    reference: 'ECG-PRE-20260312',
    description: 'ECG Electricity Bill',
    recipient: 'ECG Prepaid',
    timestamp: now - 5 * DAY,
    status: 'completed',
    url: 'https://www.ecg.com.gh/payments',
  },
  {
    id: 'rcpt_003',
    accountId: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    amount: 89.00,
    reference: 'GWCL-MAR-2026',
    description: 'GWCL Water Bill',
    recipient: 'Ghana Water Company',
    timestamp: now - 8 * DAY,
    status: 'completed',
    url: 'https://www.gwcl.com.gh/pay',
  },
  {
    id: 'rcpt_004',
    accountId: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    amount: 1250.00,
    reference: 'GRA-TAX-Q1-2026',
    description: 'GRA Tax Payment',
    recipient: 'Ghana Revenue Authority',
    timestamp: now - 35 * DAY, // February
    status: 'completed',
    url: 'https://gra.gov.gh/payments',
  },
  {
    id: 'rcpt_005',
    accountId: SAMPLE_ACCOUNT_ID,
    provider: 'mtn',
    amount: 50.00,
    reference: 'GGH-SVC-20260208',
    description: 'Ghana.gov.gh Service Fee',
    recipient: 'Ghana.gov.gh',
    timestamp: now - 38 * DAY, // February
    status: 'pending',
    url: 'https://ghana.gov.gh/services',
  },
];

const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

export const useMobileMoneyStore = create<MobileMoneyState>((set, get) => ({
  accounts: sampleAccounts,
  receipts: sampleReceipts,
  monthlyBudget: 2000,
  selectedMonth: currentMonth,

  addAccount: (account) =>
    set((state) => ({
      accounts: [
        ...state.accounts.map((a) =>
          account.isDefault ? { ...a, isDefault: false } : a
        ),
        { ...account, id: generateId() },
      ],
    })),

  removeAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    })),

  setDefaultAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    })),

  addReceipt: (receipt) =>
    set((state) => ({
      receipts: [{ ...receipt, id: generateId() }, ...state.receipts],
    })),

  removeReceipt: (id) =>
    set((state) => ({
      receipts: state.receipts.filter((r) => r.id !== id),
    })),

  setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),

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
