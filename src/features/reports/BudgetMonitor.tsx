import { useMemo } from 'react';
import { Settings, Info, HelpCircle, Wallet, TrendingUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BudgetMonitorProps {
  globalDashboardDate: Date;
  categories?: any[];
  setActiveTab?: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets') => void;
  periods?: any[];
  budgets?: any[];
  transactions?: any[];
}

export default function BudgetMonitor({
  globalDashboardDate,
  categories = [],
  setActiveTab,
  periods = [],
  budgets = [],
  transactions = []
}: BudgetMonitorProps) {
  const selectedMonth = globalDashboardDate.getMonth() + 1;
  const selectedYear = globalDashboardDate.getFullYear();

  // 1. Fetch real periods and find the matching active period
  // 1. Find the matching active period
  const activePeriodId = useMemo(() => {
    const targetMonthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    const targetPrefix = `${selectedYear}-${targetMonthStr}`;
    const matchingPeriod = periods.find((p: any) => {
      if (p.startDate && p.startDate.startsWith(targetPrefix)) return true;
      if (p.name && (p.name || '').toLowerCase().includes(targetPrefix)) return true;
      return false;
    });
    return matchingPeriod?.id || null;
  }, [periods, selectedMonth, selectedYear]);

  // 2. Compute raw budgets for the current active period
  const rawBudgets = useMemo(() => {
     if (!activePeriodId) return [];
     return budgets.filter((b: any) => b.periodId === activePeriodId);
  }, [budgets, activePeriodId]);
  
  const isLoading = false;

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Calculate Budget Progress Data from real backend budgets
  const budgetData = useMemo(() => {
    if (!rawBudgets || rawBudgets.length === 0) return [];

    return rawBudgets.map((alloc: any) => {
      const category = categories.find(
        (c) => String(c.id) === String(alloc.categoryId) || c.name === alloc.categoryName
      );
      
      const categoryName = category?.name || alloc.categoryName || 'Lainnya';
      const iconName = category?.iconName || 'HelpCircle';
      const colorClass = category?.colorClass || 'bg-slate-100 text-slate-500';
      
      const spent = Number(alloc.actual_amount || 0);
      const limit = Number(alloc.target_amount || alloc.calculatedAmount || alloc.value || 0);
      const ratio = limit > 0 ? spent / limit : 0;
      const percentage = Math.round(ratio * 100);

      return {
        id: alloc.id,
        categoryName,
        iconName,
        colorClass,
        spent,
        limit,
        percentage,
        ratio
      };
    })
    .sort((a: any, b: any) => b.percentage - a.percentage)
    .slice(0, 4);
  }, [rawBudgets, categories]);

  // Determine dynamic semantic colors based on ratio percentage
  const getSemanticColors = (percentage: number) => {
    if (percentage < 75) {
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-600'
      };
    } else if (percentage < 90) {
      return {
        bg: 'bg-amber-400',
        text: 'text-amber-600'
      };
    } else {
      return {
        bg: 'bg-rose-500',
        text: 'text-rose-600'
      };
    }
  };

  return (
    <div className="lg:col-span-6 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between min-h-[280px]" id="budget-monitor-widget">
      <div>
        <div className="flex justify-between items-center mb-5" id="budget-monitor-header">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center" id="budget-monitor-icon-container">
              <TrendingUp size={16} id="budget-monitor-trending-icon" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight" id="budget-monitor-title">Pemantau Anggaran</h3>
          </div>
          <button 
            id="budget-monitor-settings-btn"
            onClick={() => setActiveTab && setActiveTab('budgets')}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <Settings size={14} id="budget-monitor-settings-icon" />
            <span>Atur</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="animate-pulse space-y-4" id="budget-skeleton-loader">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2" id={`budget-skeleton-item-${i}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-200 rounded-full"></div>
                    <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="h-4 w-8 bg-slate-200 rounded-md"></div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                <div className="h-3 w-40 bg-slate-100 rounded-md"></div>
              </div>
            ))}
          </div>
        ) : budgetData.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-8" id="budget-empty-state">
            <Wallet className="text-slate-300 w-12 h-12" id="empty-wallet-icon" />
            <p className="text-slate-500 text-sm mt-3 font-semibold" id="empty-state-text">
              Belum ada anggaran untuk bulan ini.
            </p>
            <button
              id="create-budget-btn"
              onClick={() => setActiveTab && setActiveTab('budgets')}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              + Buat Anggaran
            </button>
          </div>
        ) : (
          /* REAL BUDGET PROGRESS LIST */
          <div className="flex flex-col gap-4" id="budget-progress-container">
            {budgetData.map((item) => {
              const { bg, text } = getSemanticColors(item.percentage);
              const IconComponent = (LucideIcons as any)[item.iconName] || HelpCircle;
              
              return (
                <div key={item.id} className="flex flex-col" id={`budget-item-${item.id}`}>
                  {/* Top Row: Icon, Name, and Spent Percentage */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.colorClass || 'bg-slate-100 text-slate-500'}`}>
                        <IconComponent size={13} />
                      </div>
                      <span className="font-semibold text-slate-700 text-xs">{item.categoryName}</span>
                    </div>
                    <span className={`font-bold text-xs ${text}`}>{item.percentage}%</span>
                  </div>
                  
                  {/* Middle Row: Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${bg}`}
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                  
                  {/* Bottom Row: Nominal Details */}
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>
                      <span className="tabular-nums font-bold text-slate-700">{formatIDR(item.spent)}</span> terpakai dari <span className="tabular-nums font-bold text-slate-600">{formatIDR(item.limit)}</span>
                    </span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      item.percentage < 75 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : item.percentage < 100 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {item.percentage < 75 ? 'Safe' : item.percentage < 100 ? 'Warning' : 'Breach'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex gap-2 items-start text-[9px] text-indigo-900/90 font-medium leading-relaxed" id="budget-monitor-tip">
        <Info size={12} className="shrink-0 text-indigo-600 mt-0.5" id="budget-tip-icon" />
        <p id="budget-tip-text">
          Alokasikan anggaran belanja secara bijak setiap bulan. Pengendalian realisasi anggaran di bawah 75% membantu Anda mengamankan pos tabungan masa depan.
        </p>
      </div>
    </div>
  );
}
