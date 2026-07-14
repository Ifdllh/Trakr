import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { 
  Target, 
  AlertTriangle, 
  ShieldCheck, 
  PieChart, 
  Coins, 
  Plus, 
  X, 
  ChevronDown, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  Info, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Transaction, Category, BudgetAllocation, BudgetPeriod, GlobalBudget, MasterAccount, MasterAsset, MasterTag, MasterContact } from '@/types';
import { 
  useGetAggregatedBudgets, 
  useDeleteCategoryBudget, 
  useGetBudgetTransactions, 
  useGetBudgetStatus, 
  useSuggestBudgets 
} from '@/features/budgets/useBudgets';

// 1. Validation Schema (Zod)
const budgetSchema = z.object({
  globalBudget: z.coerce.number().min(0, "Anggaran global tidak boleh bernilai negatif"),
  categories: z.array(z.object({
    categoryId: z.union([z.string(), z.number()]).refine(val => val !== '', "Kategori harus dipilih"),
    name: z.string().optional(),
    amount: z.coerce.number().min(0, "Anggaran kategori tidak boleh bernilai negatif"),
    iconName: z.string().optional(),
    isGenerated: z.boolean().optional()
  }))
}).refine(data => {
  const sum = data.categories.reduce((total, cat) => total + (cat.amount || 0), 0);
  return sum <= data.globalBudget;
}, {
  message: "Total alokasi anggaran kategori tidak boleh melebihi anggaran global!",
  path: ["categories"] // Highlights category list errors
});


interface BudgetManagerProps {
  categories: Category[];
  transactions: Transaction[];
  monthlyBudget: number;
  budgets: BudgetAllocation[];
  periods: BudgetPeriod[];
  globalBudgets: GlobalBudget[];
  accounts?: MasterAccount[];
  assets?: MasterAsset[];
  tags?: MasterTag[];
  contacts?: MasterContact[];
  onSaveBudget: (budget: any, id?: string) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onSaveGlobalBudget: (globalBudget: any, id?: string) => Promise<void>;
}

export default function BudgetManager({
  categories,
  transactions,
  monthlyBudget,
  budgets,
  periods,
  globalBudgets,
  accounts = [],
  assets = [],
  tags = [],
  contacts = [],
  onSaveBudget,
  onDeleteBudget,
  onSaveGlobalBudget
}: BudgetManagerProps) {
  const defaultPeriodId = useMemo(() => {
    if (periods.length === 0) return '';
    const now = new Date();
    const targetMonthStr = now.getMonth() + 1 < 10 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
    const targetPrefix = `${now.getFullYear()}-${targetMonthStr}`;
    const matchingPeriod = periods.find(p => p.startDate && p.startDate.startsWith(targetPrefix));
    return matchingPeriod?.id || periods[0]?.id || '';
  }, [periods]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  useEffect(() => {
    if (!selectedPeriod && defaultPeriodId) {
      setSelectedPeriod(defaultPeriodId);
    }
  }, [defaultPeriodId, selectedPeriod]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // 2. Fetch aggregated data & budget status KPIs via React Query
  const { data = [], isLoading: isLoadingBudgets } = useGetAggregatedBudgets(selectedPeriod);
  const currentBudgets = data as any[];
  const { data: budgetStatus = { targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 } } = useGetBudgetStatus(selectedPeriod);
  const deleteMutation = useDeleteCategoryBudget(selectedPeriod);

  const activeGlobalBudget = useMemo(() => {
    return globalBudgets.find(gb => gb.periodId === selectedPeriod);
  }, [globalBudgets, selectedPeriod]);

  const currentPeriodObj = periods.find(p => p.id === selectedPeriod);

  const { targetMonth, targetYear } = useMemo(() => {
    const periodObj = periods.find(p => p.id === selectedPeriod || String(p.id) === String(selectedPeriod));
    let m = new Date().getMonth() + 1;
    let y = new Date().getFullYear();
    if (periodObj && periodObj.startDate) {
      const parts = periodObj.startDate.split('-');
      if (parts.length >= 2) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
      }
    }
    return { targetMonth: m, targetYear: y };
  }, [periods, selectedPeriod]);

  // Suggest Budgets Query
  const { refetch: fetchSuggestions, isFetching: isFetchingSuggestions } = useSuggestBudgets(targetMonth, targetYear);

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'pengeluaran');
  }, [categories]);

  const masterCategories = expenseCategories;

  // Helper to get nominal amount
  const getEffectiveBudgetAmount = (b: any, totalTarget: number) => {
    if (b.calculatedAmount !== undefined && b.calculatedAmount !== null) {
      return Number(b.calculatedAmount);
    }
    if (b.type === 'amount') return Number(b.value);
    return (Number(b.value) / 100) * totalTarget;
  };

  const totalAllocatedAmount = useMemo(() => {
    const totalTarget = activeGlobalBudget?.totalTargetAmount || 0;
    return currentBudgets.reduce((sum, b) => sum + getEffectiveBudgetAmount(b, totalTarget), 0);
  }, [currentBudgets, activeGlobalBudget]);

  const currentExpenses = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'pengeluaran') return false;
      if (!currentPeriodObj) return true;
      if (t.date && currentPeriodObj.startDate && currentPeriodObj.endDate) {
        return t.date >= currentPeriodObj.startDate && t.date <= currentPeriodObj.endDate;
      }
      return true;
    });
  }, [transactions, currentPeriodObj]);

  const getAccountName = (accId: string | number) => {
    if (!accounts) return 'N/A';
    const found = accounts.find(a => String(a.id) === String(accId));
    return found ? found.accountName : 'N/A';
  };

  const selectedBudgetForDetail = useMemo(() => {
    return currentBudgets.find(b => b.id === activeBudgetId);
  }, [currentBudgets, activeBudgetId]);

  const { data: budgetTransactions = [], isLoading: isLoadingTransactions } = useGetBudgetTransactions(
    selectedBudgetForDetail?.categoryId || '',
    selectedPeriod || ''
  );

  // Helper to render dynamic icons
  const renderCategoryIcon = (iconName?: string) => {
    if (!iconName) {
      return <span className="text-xs font-black font-mono">?</span>;
    }
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent size={14} />;
    }
    return <span className="text-xs font-black font-mono">?</span>;
  };

  // Default Categories configuration for Form Setup
  const defaultCategories = useMemo(() => {
    const globalTarget = activeGlobalBudget?.totalTargetAmount || 0;
    return expenseCategories.map(cat => {
      const existingBudget = currentBudgets.find(b => b.categoryId === cat.id);
      const amount = existingBudget 
        ? getEffectiveBudgetAmount(existingBudget, globalTarget) 
        : 0;
      return {
        categoryId: cat.id,
        name: cat.name,
        amount: amount,
        iconName: cat.iconName || 'HelpCircle',
        isGenerated: true
      };
    });
  }, [expenseCategories, currentBudgets, activeGlobalBudget]);

  // 2. Form Setup using react-hook-form
  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      globalBudget: activeGlobalBudget?.totalTargetAmount || 0,
      categories: defaultCategories
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "categories"
  });

  // Watch fields for interactive total sum inside Form UI
  const watchAllFields = watch();
  const watchedGlobalBudget = Number(watchAllFields.globalBudget) || 0;
  const watchedCategories = watchAllFields.categories || [];
  const currentAllocatedTotal = watchedCategories.reduce((sum: number, cat: any) => sum + (Number(cat.amount) || 0), 0);
  const sisaUntukDialokasikan = watchedGlobalBudget - currentAllocatedTotal;

  // Handler for category dropdown selection in manual rows
  const handleCategoryChange = (index: number, categoryId: string | number) => {
    const cat = expenseCategories.find(c => String(c.id) === String(categoryId));
    if (cat) {
      setValue(`categories.${index}.categoryId`, cat.id, { shouldValidate: true });
      setValue(`categories.${index}.name`, cat.name, { shouldValidate: true });
      setValue(`categories.${index}.iconName`, cat.iconName || 'HelpCircle', { shouldValidate: true });
    }
  };

  // React to form modal opening
  useEffect(() => {
    if (isFormOpen) {
      reset({
        globalBudget: activeGlobalBudget?.totalTargetAmount || 0,
        categories: defaultCategories
      });
    }
  }, [isFormOpen, defaultCategories, activeGlobalBudget, reset]);

  // 3. The Auto-Generate Integration (Magic Button)
  const handleAutoGenerate = async () => {
    try {
      const result = await fetchSuggestions();
      if (result.data) {
        const suggestionsArray = result.data || [];
        const fetchedData = suggestionsArray.map((item: any) => {
          const catInfo = expenseCategories.find(c => String(c.id) === String(item.category_id));
          return {
            categoryId: item.category_id,
            name: catInfo ? catInfo.name : 'Kategori Lain',
            amount: item.suggested_amount > 0 ? item.suggested_amount : 0,
            iconName: catInfo?.iconName || 'HelpCircle',
            isGenerated: true
          };
        });
        
        // Instantly inject historical amounts without massive re-renders
        setValue('categories', fetchedData, { shouldValidate: true });
        
        setToastMessage('Anggaran berhasil diestimasikan berdasarkan riwayat 3 bulan terakhir!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error) {

      setSubmitError("Gagal mengambil rekomendasi anggaran.");
    }
  };

  const handleOpenForm = () => {
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const onSubmitForm = async (data: any) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // 1. Save / Update Global Budget
      const existingGb = globalBudgets.find(gb => gb.periodId === selectedPeriod);
      const globalBudgetId = existingGb?.id;

      await onSaveGlobalBudget({
        periodId: selectedPeriod,
        totalTargetAmount: data.globalBudget
      }, globalBudgetId);

      // 2. Save / Update Category Budgets
      // We process sequentially or in parallel. Let's process sequentially to prevent race conditions.
      for (const cat of data.categories) {
        const existingBudget = currentBudgets.find(b => b.categoryId === cat.categoryId);
        
        // Call onSaveBudget wrapper from App.tsx
        await onSaveBudget({
          periodId: selectedPeriod,
          categoryId: cat.categoryId,
          type: 'amount',
          value: cat.amount,
          calculatedAmount: cat.amount
        }, existingBudget?.id);
      }

      // Refresh query states
      queryClient.invalidateQueries({ queryKey: ['budgets', selectedPeriod] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus', selectedPeriod] });

      setToastMessage('Seluruh konfigurasi anggaran berhasil disimpan!');
      setTimeout(() => setToastMessage(null), 3000);
      setIsFormOpen(false);
    } catch (err: any) {

      setSubmitError(err.message || 'Gagal menyimpan anggaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setBudgetToDelete(id);
  };

  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteMutation.mutateAsync(budgetToDelete);
      setBudgetToDelete(null);
      setToastMessage('Anggaran kategori berhasil dihapus');
      setTimeout(() => setToastMessage(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['budgets', selectedPeriod] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus', selectedPeriod] });
    } catch (err) {

      alert('Gagal menghapus anggaran');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-100 shadow-sm rounded-xl w-fit">
          <ChevronDown size={16} className="text-indigo-600" />
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-sm"
          >
            {periods.length === 0 && <option value="">Belum Ada Periode</option>}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center">
            <Target size={32} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-lg">Belum Ada Periode</h3>
            <p className="text-sm text-slate-500">Anda perlu membuat Master Data Periode terlebih dahulu di menu Kategori / Master Data.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top-Down Allocation Dashboard Header - 4-Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Target Global */}
            <div className="bg-white p-5 rounded-2xl border-l-4 border-l-indigo-500 border-y border-r border-slate-100 flex items-center gap-4 relative group hover:border-slate-200 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Target size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">Target Anggaran Global</span>
                <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                  {budgetStatus.targetGlobal > 0 ? formatIDR(budgetStatus.targetGlobal) : 'Belum Ditentukan'}
                </h3>
              </div>
              <button 
                onClick={handleOpenForm}
                className="absolute top-4 right-4 p-1.5 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Atur Target Anggaran Global"
              >
                <Edit2 size={12} />
              </button>
            </div>

            {/* KPI 2: Total Teralokasi */}
            <div className="bg-white p-5 rounded-2xl border-l-4 border-l-purple-500 border-y border-r border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <PieChart size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">Total Teralokasi</span>
                <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                  {formatIDR(budgetStatus.totalTeralokasi)}
                </h3>
              </div>
            </div>

            {/* KPI 3: Realisasi Aktual */}
            {(() => {
              const isActualExceeded = budgetStatus.targetGlobal > 0 && budgetStatus.realisasiAktual > budgetStatus.targetGlobal;
              return (
                <div className={`bg-white p-5 rounded-2xl border-l-4 border-y border-r border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all shadow-sm ${
                  isActualExceeded ? 'border-l-red-500' : 'border-l-orange-500'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isActualExceeded ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    <Coins size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">Total Pengeluaran Aktual</span>
                    <h3 className={`text-base font-black tracking-tight mt-0.5 tabular-nums ${
                      isActualExceeded ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {formatIDR(budgetStatus.realisasiAktual)}
                    </h3>
                  </div>
                </div>
              );
            })()}

            {/* KPI 4: Sisa Saldo Anggaran */}
            {(() => {
              const isSisaSaldoNegative = budgetStatus.sisaSaldo < 0;
              return (
                <div className={`bg-white p-5 rounded-2xl border-l-4 border-y border-r border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all shadow-sm ${
                  isSisaSaldoNegative ? 'border-l-red-500' : 'border-l-emerald-500'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isSisaSaldoNegative ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {isSisaSaldoNegative ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">Sisa Saldo Anggaran</span>
                    <h3 className={`text-base font-black tracking-tight mt-0.5 tabular-nums ${
                      isSisaSaldoNegative ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {formatIDR(budgetStatus.sisaSaldo)}
                    </h3>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Allocation Progress Bar */}
          {activeGlobalBudget && activeGlobalBudget.totalTargetAmount > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-600" />
                  Rasio Distribusi Anggaran Kategori
                </span>
                <span>
                  {formatIDR(totalAllocatedAmount)} / {formatIDR(activeGlobalBudget.totalTargetAmount)} ({Math.min(100, Math.round((totalAllocatedAmount / activeGlobalBudget.totalTargetAmount) * 100))}% Allocated)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, (totalAllocatedAmount / activeGlobalBudget.totalTargetAmount) * 100)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalAllocatedAmount > activeGlobalBudget.totalTargetAmount 
                      ? 'bg-red-500' 
                      : totalAllocatedAmount === activeGlobalBudget.totalTargetAmount 
                      ? 'bg-slate-700' 
                      : 'bg-indigo-600'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Category Budgets List Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Daftar Anggaran Kategori {currentPeriodObj ? `(${currentPeriodObj.name})` : ''}</h3>
              <button
                onClick={handleOpenForm}
                disabled={periods.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> Atur Anggaran Periodik
              </button>
            </div>

            {!activeGlobalBudget ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center">
                  <Info size={32} />
                </div>
                <div className="max-w-md">
                  <h3 className="font-bold text-slate-700 text-lg">Target Anggaran Global Belum Ditentukan</h3>
                  <p className="text-sm text-slate-500 mt-1">Sesuai dengan pendekatan Top-Down Budgeting, silakan tentukan Target Anggaran Global periode ini terlebih dahulu sebelum mulai membagi anggaran ke dalam kategori.</p>
                </div>
                <button
                  onClick={handleOpenForm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-indigo-600/10 transition-all"
                >
                  Set Target Anggaran Global Sekarang
                </button>
              </div>
            ) : isLoadingBudgets ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <p className="text-slate-500 font-medium mt-2">Memuat anggaran...</p>
              </div>
            ) : currentBudgets.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center">
                  <Target size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-lg">Belum Ada Anggaran Kategori</h3>
                  <p className="text-sm text-slate-500">Target global terdefinisi. Silakan pecah target global menjadi alokasi kategori.</p>
                </div>
                <button
                  onClick={handleOpenForm}
                  className="mt-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                >
                  Buat Anggaran Kategori Sekarang
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {currentBudgets.map((budget) => {
                  const categoryInfo = expenseCategories.find(c => c.id === budget.categoryId) || {
                    name: 'Kategori Lain',
                    iconName: 'HelpCircle',
                    colorClass: 'bg-slate-100 text-slate-500'
                  };

                  const budgetAmount = getEffectiveBudgetAmount(budget, activeGlobalBudget.totalTargetAmount);
                  const spentAmount = budget.actual_amount || 0;
                  const rawPercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
                  const actualPercentage = Math.round(rawPercentage);
                  const barWidth = Math.min(100, actualPercentage);

                  const isRed = actualPercentage > 90;
                  const isWarning = actualPercentage >= 75 && actualPercentage <= 90;
                  
                  return (
                    <div 
                      key={budget.id} 
                      onClick={() => setActiveBudgetId(budget.id)}
                      className="flex flex-col md:flex-row md:items-center justify-between py-4 px-4 hover:bg-slate-50/70 transition-all duration-300 rounded-2xl cursor-pointer group gap-4"
                    >
                      {/* Left Column: Category Info (~25% width on desktop) */}
                      <div className="flex items-center gap-3 md:w-1/4">
                        {(() => {
                          const IconComponent = (LucideIcons as any)[categoryInfo.iconName] || LucideIcons.HelpCircle;
                          return (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${categoryInfo.colorClass}`}>
                              <IconComponent size={18} />
                            </div>
                          );
                        })()}
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">
                            {categoryInfo.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider tabular-nums">
                            Target: {formatIDR(budgetAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Middle Column: Slim Progress Bar (~45% width on desktop) */}
                      <div className="flex flex-col gap-1.5 md:w-5/12">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className={`${isRed ? 'text-red-600' : isWarning ? 'text-amber-500' : 'text-emerald-600'} tabular-nums`}>
                            {actualPercentage}% Terpakai ({formatIDR(spentAmount)})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${barWidth}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRed ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Right Column: Numbers and Action Buttons (~30% width on desktop) */}
                      <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">
                            Sisa Anggaran
                          </span>
                          <span className={`font-extrabold text-xs md:text-sm tabular-nums ${
                            budgetAmount - spentAmount < 0 ? 'text-red-500 font-black' : 'text-slate-700'
                          }`}>
                            {formatIDR(budgetAmount - spentAmount)}
                          </span>
                        </div>

                        {/* Minimalist Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenForm();
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-all cursor-pointer"
                            title="Edit Anggaran"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(budget.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/70 rounded-xl transition-all cursor-pointer"
                            title="Hapus Anggaran"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBudgetId(budget.id);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-all cursor-pointer"
                            title="Lihat Detail Transaksi"
                          >
                            <TrendingUp size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 4. Overhauled Budget Allocation Form Modal (RHF & Zod) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl max-w-lg w-full relative max-h-[90vh] flex flex-col"
            >
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer z-10"
              >
                <X size={20} />
              </button>

              <div className="shrink-0">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Atur Alokasi Anggaran Periodik
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  Kelola target anggaran global dan distribusikan nominal langsung ke pos pengeluaran kategori.
                </p>

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-600 font-medium">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 flex flex-col overflow-hidden space-y-4">
                
                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  
                  {/* Period Display */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Periode Aktif</span>
                    <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm">
                      {currentPeriodObj ? currentPeriodObj.name : 'Pilih Periode'}
                    </div>
                  </div>

                  {/* ✨ Auto-Generate (Berdasarkan Riwayat) Magic Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isFetchingSuggestions}
                      onClick={handleAutoGenerate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition-all cursor-pointer shadow-sm shadow-indigo-100"
                    >
                      {isFetchingSuggestions ? (
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      ) : (
                        <Sparkles size={14} className="text-indigo-600" />
                      )}
                      <span>{isFetchingSuggestions ? 'Menghitung Estimasi...' : '✨ Auto-Generate (Berdasarkan Riwayat)'}</span>
                    </button>
                  </div>

                  {/* Target Anggaran Global */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Anggaran Global</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-sm">Rp</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        {...register("globalBudget")}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-base text-slate-800"
                        placeholder="Masukkan target global"
                      />
                    </div>
                    {errors.globalBudget && (
                      <p className="text-[11px] text-red-500 font-bold">{errors.globalBudget.message}</p>
                    )}
                  </div>

                  {/* Scrollable Categories List mapped via useFieldArray */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Alokasi Anggaran per Kategori</label>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Tipe: Nominal (Rp)</span>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {fields.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Belum ada anggaran kategori. Silakan tambahkan kategori secara manual atau klik Auto-Generate.
                        </div>
                      )}
                      {fields.map((field, index) => {
                        const currentCategoryId = watchedCategories[index]?.categoryId;
                        const currentCatInfo = expenseCategories.find(c => String(c.id) === String(currentCategoryId));
                        const currentIconName = currentCatInfo?.iconName || watchedCategories[index]?.iconName;
                        const currentColorClass = currentCatInfo?.colorClass || 'bg-slate-100 text-slate-500';
                        const isGenerated = watchedCategories[index]?.isGenerated;
                        
                        return (
                          <div key={field.id} className="flex items-center justify-between gap-4 p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentColorClass}`}>
                                {renderCategoryIcon(currentIconName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                {isGenerated ? (
                                  <div className="w-full text-xs font-bold text-slate-500 bg-slate-100/60 border border-slate-200/50 rounded-lg p-2 select-none cursor-not-allowed truncate">
                                    {currentCatInfo?.name || watchedCategories[index]?.name || 'Kategori Lain'}
                                  </div>
                                ) : (
                                  <select
                                    {...register(`categories.${index}.categoryId` as const)}
                                    onChange={(e) => {
                                      register(`categories.${index}.categoryId` as const).onChange(e);
                                      handleCategoryChange(index, e.target.value);
                                    }}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={currentCategoryId || ''}
                                  >
                                    <option value="" disabled>Pilih Kategori...</option>
                                    {masterCategories.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                            
                            <div className="relative w-36 shrink-0">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold text-[10px]">Rp</span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                {...register(`categories.${index}.amount` as const)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-800 text-right"
                                placeholder="0"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Hapus Baris"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manual Addition button */}
                    <div className="flex justify-start pt-1">
                      <button
                        type="button"
                        onClick={() => append({ categoryId: '', amount: 0, iconName: '', isGenerated: false })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Tambah Kategori Lain</span>
                      </button>
                    </div>

                  </div>

                </div>

                {/* Form Footer Status & Action buttons */}
                <div className="shrink-0 border-t border-slate-100 pt-3 space-y-3">
                  
                  {/* Dynamic allocation sum summary */}
                  <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-[11px] font-bold">
                    <div>
                      <span className="text-slate-400 block uppercase text-[9px] tracking-wider">Total Teralokasi</span>
                      <span className="text-slate-700 text-xs font-black">{formatIDR(currentAllocatedTotal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block uppercase text-[9px] tracking-wider">SISA UNTUK DIALOKASIKAN</span>
                      <span className={`text-xs font-black ${sisaUntukDialokasikan < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {formatIDR(sisaUntukDialokasikan)}
                      </span>
                    </div>
                  </div>

                  {/* Zod Validation Error message */}
                  {errors.categories && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-600 font-bold animate-pulse">
                      <AlertTriangle size={14} className="text-red-500 shrink-0" />
                      <span>{errors.categories.message}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || sisaUntukDialokasikan < 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan Anggaran'}
                    </button>
                  </div>

                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {budgetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertTriangle size={24} />
                <h3 className="font-bold text-lg text-slate-900">Hapus Anggaran Kategori?</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Apakah Anda yakin ingin menghapus alokasi anggaran untuk kategori ini? Dana akan dikembalikan ke Sisa Anggaran Global.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setBudgetToDelete(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-bounce"
          >
            <ShieldCheck size={20} className="text-emerald-400" />
            <span className="font-bold text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Drill-Down Detail Modal */}
      <AnimatePresence>
        {activeBudgetId && selectedBudgetForDetail && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-2xl max-w-xl w-full relative flex flex-col max-h-[85vh]"
            >
              <button 
                type="button"
                onClick={() => setActiveBudgetId(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Section 1: Header */}
              {(() => {
                const categoryInfo = expenseCategories.find(c => c.id === selectedBudgetForDetail.categoryId);
                const IconComponent = categoryInfo ? ((LucideIcons as any)[categoryInfo.iconName] || HelpCircle) : HelpCircle;
                const categoryName = categoryInfo ? categoryInfo.name : 'Kategori';
                const periodName = currentPeriodObj ? currentPeriodObj.name : '';

                return (
                  <div className="flex items-center gap-3 pr-10 mb-4 pb-3 border-b border-slate-100 shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${categoryInfo?.colorClass || 'bg-slate-100 text-slate-600'}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                        Detail Anggaran {categoryName}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold">
                        Periode: {periodName}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Section 2: Summary Banner */}
              <div className="mb-4 shrink-0">
                {selectedBudgetForDetail && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Target Anggaran</span>
                      <span className="font-extrabold text-slate-800 text-xs md:text-sm tabular-nums">
                        {formatIDR(getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Total Realisasi</span>
                      <span className="font-extrabold text-red-600 text-xs md:text-sm tabular-nums">
                        {formatIDR(selectedBudgetForDetail.actual_amount || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Sisa Anggaran</span>
                      <span className={`font-extrabold text-xs md:text-sm tabular-nums ${
                        getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0) - (selectedBudgetForDetail.actual_amount || 0) < 0 
                          ? 'text-red-500 font-black' 
                          : 'text-emerald-600'
                      }`}>
                        {formatIDR(getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0) - (selectedBudgetForDetail.actual_amount || 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Transaction Table */}
              <div className="flex-1 overflow-y-auto max-h-[50vh] border border-slate-100 rounded-2xl">
                {isLoadingTransactions ? (
                  <div className="space-y-4 p-5 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex gap-4 items-center justify-between">
                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/6" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px] md:text-xs">
                    <thead className="bg-slate-50 sticky top-0 text-slate-500 font-bold border-b border-slate-100 z-10">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Sub-Kategori</th>
                        <th className="p-3">Catatan</th>
                        <th className="p-3">Sumber Dana</th>
                        <th className="p-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                            Tidak ada transaksi pengeluaran di kategori ini untuk periode ini.
                          </td>
                        </tr>
                      ) : (
                        budgetTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                              {tx.date ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                            <td className="p-3 font-bold text-slate-700">
                              {tx.subcategory || '-'}
                            </td>
                            <td className="p-3 text-slate-500 max-w-[150px] truncate" title={tx.description}>
                              {tx.description || '-'}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                {getAccountName(tx.accountId)}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-red-600 tabular-nums">
                              {formatIDR(tx.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveBudgetId(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
