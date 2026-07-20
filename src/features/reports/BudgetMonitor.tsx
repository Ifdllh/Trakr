import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Info, HelpCircle, Wallet, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BudgetMonitorProps {
  globalDashboardDate: Date;
  categories?: any[];
  setActiveTab?: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets') => void;
  periods?: any[];
  budgets?: any[];
  transactions?: any[];
  globalBudgets?: any[];
  selectedPeriod?: any;
}

export default function BudgetMonitor({
  globalDashboardDate,
  categories = [],
  setActiveTab,
  periods = [],
  budgets = [],
  transactions = [],
  globalBudgets = [],
  selectedPeriod
}: BudgetMonitorProps) {
  const { t } = useTranslation();

  // 1. Find the matching active period
  const activePeriodId = useMemo(() => {
    return selectedPeriod?.id || null;
  }, [selectedPeriod]);

  const activePeriodObj = useMemo(() => {
    return selectedPeriod || null;
  }, [selectedPeriod]);

  // 2. Compute raw budgets for the current active period
  const rawBudgets = useMemo(() => {
     if (!activePeriodId) return [];
     return budgets.filter((b: any) => {
       // Primary Fix: Match by periodId
       if (b.periodId) {
         return String(b.periodId) === String(activePeriodId);
       }
       // Fallback Fix (Date Bounds)
       if (activePeriodObj?.startDate && b.startDate && activePeriodObj?.endDate && b.endDate) {
         return activePeriodObj.startDate === b.startDate && activePeriodObj.endDate === b.endDate;
       }
       if (activePeriodObj?.startDate && b.startDate) {
         return activePeriodObj.startDate === b.startDate;
       }
       return false;
     });
  }, [budgets, activePeriodId, activePeriodObj]);

  // 3. Compute real expenditures for this period
  const transactionsByPeriod = useMemo(() => {
    if (!activePeriodId) return [];
    return transactions.filter((t: any) => {
      const typeLower = t.type?.toLowerCase();
      const isExpense = typeLower === 'dr' || typeLower === 'pengeluaran';
      if (!isExpense) return false;
      
      const match = t.periodId && String(t.periodId) === String(activePeriodId);
      if (match) return true;
      
      if (t.date && activePeriodObj?.startDate && activePeriodObj?.endDate) {
        const tDate = new Date(t.date);
        const sDate = new Date(activePeriodObj.startDate);
        const eDate = new Date(activePeriodObj.endDate);
        
        tDate.setHours(0, 0, 0, 0);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(0, 0, 0, 0);
        
        return tDate >= sDate && tDate <= eDate;
      }
      return false;
    });
  }, [transactions, activePeriodId, activePeriodObj]);

  const totalSpent = useMemo(() => {
    return transactionsByPeriod.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  }, [transactionsByPeriod]);

  // Helper for budget values
  function getEffectiveBudgetAmount(b: any, totalTarget: number) {
    if (b.calculatedAmount !== undefined && b.calculatedAmount !== null) {
      return Number(b.calculatedAmount);
    }
    if (b.type === 'amount') return Number(b.value || 0);
    return (Number(b.value || 0) / 100) * totalTarget;
  }

  // 4. Compute Total Target Budget for this period
  const totalBudget = useMemo(() => {
    if (!activePeriodId) return 0;
    
    // Find global budget for this period
    const periodGlobal = globalBudgets.find((b: any) => {
      // Primary Fix: Match by periodId
      if (b.periodId) {
        return String(b.periodId) === String(activePeriodId);
      }
      // Fallback Fix (Date Bounds)
      if (activePeriodObj?.startDate && b.startDate && activePeriodObj?.endDate && b.endDate) {
        return activePeriodObj.startDate === b.startDate && activePeriodObj.endDate === b.endDate;
      }
      if (activePeriodObj?.startDate && b.startDate) {
        return activePeriodObj.startDate === b.startDate;
      }
      return false;
    });
    const targetGlobalRaw = periodGlobal ? Number((periodGlobal as any).totalTargetAmount) : 0;
    if (targetGlobalRaw > 0) return targetGlobalRaw;
    
    // Fallback: sum of all category budgets for this period
    return rawBudgets.reduce((sum: number, b: any) => sum + getEffectiveBudgetAmount(b, 0), 0);
  }, [activePeriodId, globalBudgets, rawBudgets, activePeriodObj]);

  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = remainingBudget < 0;
  const progressPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const isBudgetConfigured = totalBudget > 0 || rawBudgets.length > 0;
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

  return (
    <div className="lg:col-span-6 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between min-h-[280px]" id="budget-monitor-widget">
      <div>
        <div className="flex justify-between items-center mb-5" id="budget-monitor-header">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center" id="budget-monitor-icon-container">
              <TrendingUp size={16} id="budget-monitor-trending-icon" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight" id="budget-monitor-title">{t('dashboard.budget_monitor_widget.title', 'Pemantau Anggaran')}</h3>
          </div>
          <button 
            id="budget-monitor-settings-btn"
            onClick={() => setActiveTab && setActiveTab('budgets')}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <Settings size={14} id="budget-monitor-settings-icon" />
            <span>{t('dashboard.budget_monitor_widget.manage', 'Atur')}</span>
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
        ) : !isBudgetConfigured ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-8" id="budget-empty-state">
            <Wallet className="text-slate-300 w-12 h-12" id="empty-wallet-icon" />
            <p className="text-slate-500 text-sm mt-3 font-semibold" id="empty-state-text">
              {t('dashboard.budget_monitor_widget.no_budget_this_month', 'Belum ada anggaran untuk bulan ini.')}
            </p>
            <button
              id="create-budget-btn"
              onClick={() => setActiveTab && setActiveTab('budgets')}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('dashboard.budget_monitor_widget.create_budget', '+ Buat Anggaran')}
            </button>
          </div>
        ) : (
          /* COMPACT SUMMARY VIEW (MINIATURE UI) */
          <div className="space-y-5" id="budget-summary-view">
            {/* Sisa Anggaran Box */}
            <div className={`p-4 rounded-2xl flex items-center gap-4 ${
              isOverBudget ? 'bg-rose-50/50 border border-rose-100' : 'bg-emerald-50/50 border border-emerald-100'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOverBudget ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {isOverBudget ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('dashboard.budget_monitor_widget.remaining_budget', 'Sisa Anggaran')}</span>
                <h3 className={`text-xl font-black tracking-tight mt-0.5 tabular-nums ${
                  isOverBudget ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {formatIDR(remainingBudget)}
                </h3>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">{t('dashboard.budget_monitor_widget.spending_progress', 'Progres Penggunaan')}</span>
                <span className={`font-bold ${
                  progressPercent < 75 
                    ? 'text-emerald-600' 
                    : progressPercent < 100 
                    ? 'text-amber-600' 
                    : 'text-rose-600'
                }`}>{progressPercent}% {t('dashboard.budget_monitor_widget.used_suffix', 'Terpakai')}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercent < 75 
                      ? 'bg-emerald-500' 
                      : progressPercent < 100 
                      ? 'bg-amber-500' 
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>{t('dashboard.budget_monitor_widget.used_prefix', 'Terpakai:')} <strong className="text-slate-700 font-bold tabular-nums">{formatIDR(totalSpent)}</strong></span>
                <span>{t('dashboard.budget_monitor_widget.total_budget', 'Total Anggaran:')} <strong className="text-slate-700 font-bold tabular-nums">{formatIDR(totalBudget)}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex gap-2 items-start text-[9px] text-indigo-900/90 font-medium leading-relaxed" id="budget-monitor-tip">
        <Info size={12} className="shrink-0 text-indigo-600 mt-0.5" id="budget-tip-icon" />
        <p id="budget-tip-text">
          {t('dashboard.budget_monitor_widget.info_box', 'Alokasikan anggaran belanja secara bijak setiap bulan. Pengendalian realisasi anggaran di bawah 75% membantu Anda mengamankan pos tabungan masa depan.')}
        </p>
      </div>
    </div>
  );
}
