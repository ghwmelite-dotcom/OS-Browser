import { create } from 'zustand';

interface BudgetPlan {
  monthlyLimitGB: number;
  carrier: string;
  planName: string;
  costPerGB: number;
  usedGB: number;
}

interface DataSaverState {
  totalBytesToday: number;
  totalBytesSaved: number;
  estimatedCostGHS: number;
  estimatedSavedGHS: number;
  budget: BudgetPlan | null;
  liteModeEnabled: boolean;

  loadStats: () => Promise<void>;
  toggleLiteMode: () => void;
  setBudget: (budget: BudgetPlan) => Promise<void>;
}

const COST_PER_GB_DEFAULT = 5.71; // GH₵20 for 3.5GB (MTN average)

export const useDataSaverStore = create<DataSaverState>((set, get) => ({
  totalBytesToday: 0,
  totalBytesSaved: 0,
  estimatedCostGHS: 0,
  estimatedSavedGHS: 0,
  budget: null,
  liteModeEnabled: false,

  loadStats: async () => {
    // In real implementation, this would call IPC to get stats from main process
    // For now, track in-memory from session
    const state = get();
    const costPerGB = state.budget?.costPerGB ?? COST_PER_GB_DEFAULT;
    const usedGB = state.totalBytesToday / (1024 * 1024 * 1024);
    const savedGB = state.totalBytesSaved / (1024 * 1024 * 1024);
    set({
      estimatedCostGHS: usedGB * costPerGB,
      estimatedSavedGHS: savedGB * costPerGB,
    });
  },

  toggleLiteMode: () => set(s => ({ liteModeEnabled: !s.liteModeEnabled })),

  setBudget: async (budget) => set({ budget }),
}));
