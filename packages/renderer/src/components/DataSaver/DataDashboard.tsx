import React, { useState } from 'react';
import { BarChart3, TrendingDown, DollarSign, Zap, Settings } from 'lucide-react';
import { useDataSaverStore } from '@/store/datasaver';

interface CarrierPlan {
  name: string;
  gb: number;
  cost: number;
}

interface Carrier {
  name: string;
  color: string;
  plans: CarrierPlan[];
}

const GHANA_CARRIERS: Record<string, Carrier> = {
  mtn: {
    name: 'MTN Ghana',
    color: '#FFCC00',
    plans: [
      { name: 'GH₵5 Daily', gb: 0.35, cost: 5 },
      { name: 'GH₵20 Weekly', gb: 3.5, cost: 20 },
      { name: 'GH₵50 Monthly', gb: 12, cost: 50 },
      { name: 'GH₵100 Monthly', gb: 30, cost: 100 },
    ],
  },
  telecel: {
    name: 'Telecel Ghana',
    color: '#E30613',
    plans: [
      { name: 'GH₵5 Daily', gb: 0.3, cost: 5 },
      { name: 'GH₵20 Weekly', gb: 3, cost: 20 },
      { name: 'GH₵50 Monthly', gb: 10, cost: 50 },
    ],
  },
  at: {
    name: 'AT Ghana',
    color: '#FF0000',
    plans: [
      { name: 'GH₵5 Daily', gb: 0.3, cost: 5 },
      { name: 'GH₵20 Weekly', gb: 3, cost: 20 },
    ],
  },
};

export function DataDashboard() {
  const {
    totalBytesToday,
    totalBytesSaved,
    estimatedCostGHS,
    estimatedSavedGHS,
    budget,
    liteModeEnabled,
    toggleLiteMode,
    setBudget,
  } = useDataSaverStore();

  const [showSetup, setShowSetup] = useState(!budget);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('mtn');
  const [selectedPlan, setSelectedPlan] = useState<CarrierPlan | null>(null);

  const totalMB = (totalBytesToday / (1024 * 1024)).toFixed(1);
  const savedMB = (totalBytesSaved / (1024 * 1024)).toFixed(1);

  const budgetUsedRatio = budget ? budget.usedGB / budget.monthlyLimitGB : 0;
  const budgetBarColor =
    budgetUsedRatio > 0.9 ? '#CE1126' : budgetUsedRatio > 0.75 ? '#FCD116' : '#006B3F';

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[780px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Data Usage Dashboard</h1>
            <p className="text-[12px] text-text-muted">
              Track your internet data consumption in Ghana Cedis
            </p>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: BarChart3,
              label: 'Used Today',
              value: `${totalMB} MB`,
              sub: `≈ GH₵${estimatedCostGHS.toFixed(2)}`,
              color: '#3B82F6',
            },
            {
              icon: TrendingDown,
              label: 'Data Saved',
              value: `${savedMB} MB`,
              sub: `≈ GH₵${estimatedSavedGHS.toFixed(2)} saved`,
              color: '#006B3F',
            },
            {
              icon: DollarSign,
              label: 'Budget Left',
              value: budget
                ? `${((budget.monthlyLimitGB - budget.usedGB) * 1024).toFixed(0)} MB`
                : 'Not set',
              sub: budget ? budget.planName : 'Set up your plan',
              color: '#D4A017',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-5 border"
              style={{
                background: 'var(--color-surface-1)',
                borderColor: 'var(--color-border-1)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} style={{ color: stat.color }} />
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
                  {stat.label}
                </span>
              </div>
              <p className="text-[24px] font-bold text-text-primary">{stat.value}</p>
              <p className="text-[12px] text-text-muted mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Lite Mode Toggle */}
        <div
          className="rounded-xl p-5 border mb-8 flex items-center justify-between"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: liteModeEnabled ? 'var(--color-accent)' : 'var(--color-surface-2)',
              }}
            >
              <Zap
                size={20}
                style={{ color: liteModeEnabled ? '#fff' : 'var(--color-text-muted)' }}
              />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Ultra Lite Mode</p>
              <p className="text-[12px] text-text-muted">
                Block images, web fonts, autoplay videos, and tracking scripts to save data
              </p>
            </div>
          </div>
          <button
            onClick={toggleLiteMode}
            className="w-11 h-6 rounded-full transition-all relative shrink-0"
            style={{
              background: liteModeEnabled ? 'var(--color-accent)' : 'var(--color-border-2)',
            }}
            aria-label={liteModeEnabled ? 'Disable Lite Mode' : 'Enable Lite Mode'}
            role="switch"
            aria-checked={liteModeEnabled}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                liteModeEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Budget Setup */}
        <div
          className="rounded-xl border overflow-hidden mb-8"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border-1)' }}
          >
            <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <Settings size={16} style={{ color: 'var(--color-accent)' }} />
              Data Budget
            </h2>
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="text-[12px] font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              {showSetup ? 'Close' : 'Change Plan'}
            </button>
          </div>

          {showSetup && (
            <div className="p-5">
              <p className="text-[13px] text-text-secondary mb-4">
                Select your carrier and data plan to track your budget:
              </p>

              {/* Carrier Selection */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Object.entries(GHANA_CARRIERS).map(([key, carrier]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCarrier(key);
                      setSelectedPlan(null);
                    }}
                    className="p-3 rounded-xl border text-center transition-all"
                    style={{
                      borderColor:
                        selectedCarrier === key ? carrier.color : 'var(--color-border-1)',
                      background:
                        selectedCarrier === key ? `${carrier.color}18` : 'transparent',
                    }}
                  >
                    <p className="text-[13px] font-bold text-text-primary">{carrier.name}</p>
                  </button>
                ))}
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                {GHANA_CARRIERS[selectedCarrier]?.plans.map((plan) => (
                  <button
                    key={plan.name}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
                    style={{
                      borderColor:
                        selectedPlan?.name === plan.name
                          ? 'var(--color-accent)'
                          : 'var(--color-border-1)',
                      background:
                        selectedPlan?.name === plan.name
                          ? 'var(--glass-bg)'
                          : 'transparent',
                    }}
                  >
                    <span className="text-[13px] font-medium text-text-primary">{plan.name}</span>
                    <span className="text-[12px] text-text-muted">{plan.gb} GB</span>
                  </button>
                ))}
              </div>

              {selectedPlan && (
                <button
                  onClick={() => {
                    setBudget({
                      monthlyLimitGB: selectedPlan.gb,
                      carrier: selectedCarrier,
                      planName: selectedPlan.name,
                      costPerGB: selectedPlan.cost / selectedPlan.gb,
                      usedGB: 0,
                    });
                    setShowSetup(false);
                  }}
                  className="w-full mt-4 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  Set as My Plan
                </button>
              )}
            </div>
          )}

          {!showSetup && budget && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-text-secondary">
                  {budget.planName} ({budget.carrier.toUpperCase()})
                </span>
                <span className="text-[13px] font-bold text-text-primary">
                  {budget.usedGB.toFixed(2)} / {budget.monthlyLimitGB} GB
                </span>
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: 'var(--color-border-1)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, budgetUsedRatio * 100)}%`,
                    background: budgetBarColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-text-muted">
          Powered by OHCS — Helping Ghana's civil servants manage their data costs
        </p>
      </div>
    </div>
  );
}
