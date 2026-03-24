import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingDown,
  DollarSign,
  Zap,
  Settings,
  AlertTriangle,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useDataSaverStore } from '@/store/datasaver';

// ── Types ──────────────────────────────────────────────────────────────
interface SiteDataUsage {
  hostname: string;
  bytesReceived: number;
  bytesSent: number;
  requestCount: number;
}

interface DataUsageResponse {
  totalBytesToday: number;
  topSites: SiteDataUsage[];
  costEstimate: number;
}

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

// ── Ghana Carrier Plans ────────────────────────────────────────────────
const GHANA_CARRIERS: Record<string, Carrier> = {
  mtn: {
    name: 'MTN Ghana',
    color: '#FFCC00',
    plans: [
      { name: 'GH\u20B55 Daily', gb: 0.35, cost: 5 },
      { name: 'GH\u20B520 Weekly', gb: 3.5, cost: 20 },
      { name: 'GH\u20B550 Monthly', gb: 12, cost: 50 },
      { name: 'GH\u20B5100 Monthly', gb: 30, cost: 100 },
    ],
  },
  telecel: {
    name: 'Telecel Ghana',
    color: '#E30613',
    plans: [
      { name: 'GH\u20B55 Daily', gb: 0.3, cost: 5 },
      { name: 'GH\u20B520 Weekly', gb: 3, cost: 20 },
      { name: 'GH\u20B550 Monthly', gb: 10, cost: 50 },
    ],
  },
  at: {
    name: 'AT Ghana',
    color: '#FF0000',
    plans: [
      { name: 'GH\u20B55 Daily', gb: 0.3, cost: 5 },
      { name: 'GH\u20B520 Weekly', gb: 3, cost: 20 },
    ],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function truncateHost(host: string, max = 28): string {
  return host.length > max ? host.slice(0, max) + '\u2026' : host;
}

// ── Component ──────────────────────────────────────────────────────────
export function DataDashboard() {
  const {
    budget,
    liteModeEnabled,
    toggleLiteMode,
    setBudget,
  } = useDataSaverStore();

  const [showSetup, setShowSetup] = useState(!budget);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('mtn');
  const [selectedPlan, setSelectedPlan] = useState<CarrierPlan | null>(null);

  // Live data from main process
  const [liveData, setLiveData] = useState<DataUsageResponse>({
    totalBytesToday: 0,
    topSites: [],
    costEstimate: 0,
  });

  const fetchUsage = useCallback(async () => {
    try {
      const data = await (window as any).osBrowser.dataTracker.getUsage();
      if (data) setLiveData(data);
    } catch {
      // Main process may not have data tracker ready yet
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 10_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const { totalBytesToday, topSites, costEstimate } = liveData;

  // Budget calculations
  const budgetUsedRatio = budget ? (totalBytesToday / (budget.monthlyLimitGB * 1024 * 1024 * 1024)) : 0;
  const budgetBarColor =
    budgetUsedRatio > 0.9 ? '#CE1126' : budgetUsedRatio > 0.75 ? '#FCD116' : '#006B3F';
  const showBudgetWarning = budget && budgetUsedRatio >= 0.8;

  // Find max bytes for bar proportions
  const maxSiteBytes = topSites.length > 0
    ? Math.max(...topSites.map(s => s.bytesReceived + s.bytesSent))
    : 1;

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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Data Usage Dashboard</h1>
            <p className="text-[12px] text-text-muted">
              Track your internet data consumption in Ghana Cedis
            </p>
          </div>
          <button
            onClick={fetchUsage}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'var(--color-surface-2)' }}
            title="Refresh data"
          >
            <RefreshCw size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Budget Warning */}
        {showBudgetWarning && (
          <div
            className="rounded-xl p-4 border mb-6 flex items-center gap-3"
            style={{
              background: budgetUsedRatio >= 0.9 ? '#CE112615' : '#FCD11620',
              borderColor: budgetUsedRatio >= 0.9 ? '#CE112640' : '#FCD11640',
            }}
          >
            <AlertTriangle
              size={20}
              style={{ color: budgetUsedRatio >= 0.9 ? '#CE1126' : '#D4A017', flexShrink: 0 }}
            />
            <div>
              <p className="text-[13px] font-semibold text-text-primary">
                {budgetUsedRatio >= 0.9 ? 'Data budget almost exhausted!' : 'Approaching data limit'}
              </p>
              <p className="text-[12px] text-text-muted">
                You have used {(budgetUsedRatio * 100).toFixed(0)}% of your{' '}
                {budget!.planName} data plan.
              </p>
            </div>
          </div>
        )}

        {/* Hero Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: BarChart3,
              label: 'Used Today',
              value: formatBytes(totalBytesToday),
              sub: `\u2248 GH\u20B5${costEstimate.toFixed(2)}`,
              color: '#3B82F6',
            },
            {
              icon: TrendingDown,
              label: 'Requests',
              value: topSites.reduce((sum, s) => sum + s.requestCount, 0).toLocaleString(),
              sub: `${topSites.length} sites tracked`,
              color: '#006B3F',
            },
            {
              icon: DollarSign,
              label: 'Budget Left',
              value: budget
                ? formatBytes(Math.max(0, budget.monthlyLimitGB * 1024 * 1024 * 1024 - totalBytesToday))
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

        {/* Budget Progress */}
        {budget && (
          <div
            className="rounded-xl p-5 border mb-8"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-text-secondary">
                {budget.planName} ({budget.carrier.toUpperCase()})
              </span>
              <span className="text-[13px] font-bold text-text-primary">
                {formatBytes(totalBytesToday)} / {budget.monthlyLimitGB} GB
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
            <p className="text-[11px] text-text-muted mt-2 text-right">
              {(budgetUsedRatio * 100).toFixed(1)}% used
            </p>
          </div>
        )}

        {/* Top Sites Table */}
        <div
          className="rounded-xl border overflow-hidden mb-8"
          style={{
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center gap-2"
            style={{ borderColor: 'var(--color-border-1)' }}
          >
            <Globe size={16} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-[14px] font-bold text-text-primary">Top Sites by Data Usage</h2>
          </div>

          {topSites.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-text-muted">No data tracked yet. Start browsing!</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border-1)' }}>
              {/* Table Header */}
              <div
                className="grid px-5 py-2.5"
                style={{
                  gridTemplateColumns: '1fr 120px 80px 80px',
                  borderBottomColor: 'var(--color-border-1)',
                }}
              >
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
                  Site
                </span>
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium text-right">
                  Data Used
                </span>
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium text-right">
                  Requests
                </span>
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium text-right">
                  Cost
                </span>
              </div>

              {/* Rows */}
              {topSites.map((site) => {
                const totalBytes = site.bytesReceived + site.bytesSent;
                const proportion = totalBytes / maxSiteBytes;
                const costGHS = (totalBytes / (1024 * 1024 * 1024)) * 5.71;
                const barColor =
                  proportion > 0.8 ? '#CE1126' : proportion > 0.5 ? '#FCD116' : '#006B3F';

                return (
                  <div
                    key={site.hostname}
                    className="grid px-5 py-3 items-center"
                    style={{
                      gridTemplateColumns: '1fr 120px 80px 80px',
                      borderBottomColor: 'var(--color-border-1)',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">
                        {truncateHost(site.hostname)}
                      </p>
                      {/* Proportion bar */}
                      <div
                        className="h-1.5 rounded-full mt-1"
                        style={{ background: 'var(--color-border-1)', maxWidth: 160 }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, proportion * 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[13px] text-text-secondary text-right font-mono">
                      {formatBytes(totalBytes)}
                    </span>
                    <span className="text-[13px] text-text-muted text-right font-mono">
                      {site.requestCount.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-text-secondary text-right font-mono">
                      GH\u20B5{costGHS.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

        {/* Data Plan Setup */}
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
              Data Plan
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
        </div>

        <p className="text-center text-[10px] text-text-muted">
          Designed & Developed by Osborn Hodges | Powered by RSIMD(OHCS)
        </p>
      </div>
    </div>
  );
}
