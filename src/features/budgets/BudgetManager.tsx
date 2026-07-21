import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { BudgetSkeleton } from '@/components/SkeletonLoader';
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
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EditSingleBudgetModal } from "./EditSingleBudgetModal";
import { NumericFormat } from 'react-number-format';
import { api } from '@/lib/api';
import { Transaction, Category, BudgetAllocation, BudgetPeriod, GlobalBudget, MasterAccount, MasterAsset, MasterTag, MasterContact } from '@/types';
import { useToast } from '@/context/ToastContext';
import { subscribeToCollection } from '@/services/dbServices';
import { where } from 'firebase/firestore';


interface BudgetManagerProps {
  user?: any;
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

const getLocalizedPeriodName = (period: BudgetPeriod | undefined, currentLanguage: string) => {
  if (!period) return '';
  
  // Prioritizing the user-defined name is mandatory
  const actualName = period.name || (period as any).periodName;
  if (actualName) {
    return actualName;
  }
  
  // Default fallback: use the endDate for the month calculation, not the startDate
  let dateToFormat: Date | null = null;
  if (period.endDate) {
    try {
      const [year, month, day] = period.endDate.split('-').map(Number);
      dateToFormat = new Date(year, month - 1, 15);
    } catch (e) {
      // ignore
    }
  }
  
  if (dateToFormat && !isNaN(dateToFormat.getTime())) {
    const locale = currentLanguage === 'en' ? 'en-US' : 'id-ID';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(dateToFormat);
  }
  
  return '';
};

const isCategoryMatch = (t: any, budgetCategoryId: string, categoryInfo: any): boolean => {
  // 1. Direct ID match
  if (t.categoryId && String(t.categoryId) === String(budgetCategoryId)) return true;
  if (t.category && String(t.category).toLowerCase().trim() === String(budgetCategoryId).toLowerCase().trim()) return true;

  // 2. Original Name Match (fallback to whatever categoryInfo says)
  if (categoryInfo && categoryInfo.name) {
    if (t.category && String(t.category).toLowerCase().trim() === String(categoryInfo.name).toLowerCase().trim()) return true;
  }

  // 3. Robust English & Indonesian Mapping for Predefined Categories
  const catIdLower = String(budgetCategoryId).toLowerCase();
  
  const englishMapping: Record<string, string> = {
    'makanan': 'food & beverage',
    'transportasi': 'transportation',
    'belanja': 'shopping',
    'hiburan': 'entertainment',
    'tagihan': 'bills & utilities',
    'kesehatan': 'health & medical',
    'pendidikan': 'education',
    'keluarga': 'family & personal',
    'investasi': 'investment',
    'asuransi': 'insurance',
    'hadiah': 'gifts & donations',
    'lainnya': 'others'
  };

  const idMapping: Record<string, string> = {
    'makanan': 'makanan & minuman',
    'transportasi': 'transportasi',
    'belanja': 'belanja',
    'hiburan': 'hiburan',
    'tagihan': 'tagihan & utilitas',
    'kesehatan': 'kesehatan',
    'pendidikan': 'pendidikan',
    'keluarga': 'keluarga & pribadi',
    'investasi': 'investasi',
    'asuransi': 'asuransi',
    'hadiah': 'hadiah & donasi',
    'lainnya': 'lainnya'
  };

  const enName = englishMapping[catIdLower];
  if (enName && t.category && String(t.category).toLowerCase().trim() === enName) return true;

  const idName = idMapping[catIdLower];
  if (idName && t.category && String(t.category).toLowerCase().trim() === idName) return true;

  return false;
};

export default function BudgetManager({
  user,
  categories,
  transactions = [],
  monthlyBudget,
  budgets = [],
  periods,
  globalBudgets = [],
  accounts = [],
  assets = [],
  tags = [],
  contacts = [],
  onSaveBudget,
  onDeleteBudget,
  onSaveGlobalBudget
}: BudgetManagerProps) {
  const { t, i18n } = useTranslation();

  // 1. Validation Schema (Zod) dynamically created with translations
  const budgetSchema = useMemo(() => {
    return z.object({
      globalBudget: z.preprocess((val) => (val === '' ? 0 : val), z.coerce.number().min(0, t('budgets.validation_global_negative', 'Anggaran global tidak boleh bernilai negatif'))),
      categories: z.array(z.object({
        categoryId: z.union([z.string(), z.number()]).refine(val => val !== '', t('budgets.validation_category_required', 'Kategori harus dipilih')),
        name: z.string().optional(),
        amount: z.preprocess((val) => (val === '' ? 0 : val), z.coerce.number().min(0, t('budgets.validation_category_negative', 'Anggaran kategori tidak boleh bernilai negatif'))),
        type: z.enum(['amount', 'percentage']).default('amount'),
        iconName: z.string().optional(),
        isGenerated: z.boolean().optional()
      }))
    }).refine(data => {
      const globalBudget = data.globalBudget;
      const sum = data.categories.reduce((total, cat) => {
        const val = cat.amount || 0;
        const nominal = cat.type === 'percentage' ? (globalBudget * val / 100) : val;
        return total + nominal;
      }, 0);
      return sum <= globalBudget;
    }, {
      message: t('budgets.validation_sum_exceeded', 'Total alokasi anggaran kategori tidak boleh melebihi anggaran global!'),
      path: ["categories"] // Highlights category list errors
    });
  }, [t]);

  // Filter out soft-deleted periods
  const activePeriods = useMemo(() => periods.filter(p => p.isActive !== false), [periods]);

  const defaultPeriodId = useMemo(() => {
    if (activePeriods.length === 0) return '';
    const now = new Date();
    const targetMonthStr = now.getMonth() + 1 < 10 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
    const targetPrefix = `${now.getFullYear()}-${targetMonthStr}`;
    const matchingPeriod = activePeriods.find(p => p.startDate && p.startDate.startsWith(targetPrefix));
    return matchingPeriod?.id || activePeriods[0]?.id || '';
  }, [activePeriods]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPeriod && defaultPeriodId) {
      setSelectedPeriod(defaultPeriodId);
    }
  }, [defaultPeriodId, selectedPeriod]);


  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [singleEditModalOpen, setSingleEditModalOpen] = useState(false);
  const [singleEditBudget, setSingleEditBudget] = useState<BudgetAllocation | null>(null);

  const handleSaveSingleBudget = async (id: string, amount: number) => {
    try {
      await onSaveBudget({ value: amount, type: 'amount', calculatedAmount: amount }, id);
      showToast(t('budgets.toast_save_success', 'Anggaran berhasil diperbarui' ) || 'Anggaran berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui anggaran', 'error');
    }
  };


  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Helper to get nominal amount
  function getEffectiveBudgetAmount(b: any, totalTarget: number) {
    if (b.calculatedAmount !== undefined && b.calculatedAmount !== null) {
      return Number(b.calculatedAmount);
    }
    if (b.type === 'amount') return Number(b.value || 0);
    return (Number(b.value || 0) / 100) * totalTarget;
  }

  // 2. Local computations for Budgets
  const currentBudgets = useMemo(() => budgets.filter(b => b.periodId === selectedPeriod), [budgets, selectedPeriod]);
  
  const currentPeriodObj = useMemo(() => activePeriods.find(p => p.id === selectedPeriod), [activePeriods, selectedPeriod]);

  const transactionsByPeriod = useMemo(() => {
    if (!selectedPeriod) return [];
    
    // Fallback: get current period details to match by date bounds
    const pObj = activePeriods.find(p => String(p.id) === String(selectedPeriod));
    
    return transactions.filter((t: any) => {
      const typeLower = (t.type || '').toLowerCase();
      // Ensure it is an expense
      const isExpense = typeLower === 'dr' || typeLower === 'pengeluaran' || typeLower === 'expense';
      if (!isExpense) return false;
      
      // Strict ID matching first
      if (t.periodId && String(t.periodId) === String(selectedPeriod)) return true;
      
      // Fallback: Date bounds checking
      if (pObj && pObj.startDate && pObj.endDate) {
        const tDateRaw = t.date || t.createdAt;
        if (!tDateRaw) return false;
        
        const tDate = new Date(tDateRaw);
        const sDate = new Date(pObj.startDate);
        const eDate = new Date(pObj.endDate);
        
        if (!isNaN(tDate.getTime()) && !isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
          tDate.setHours(0, 0, 0, 0);
          sDate.setHours(0, 0, 0, 0);
          eDate.setHours(0, 0, 0, 0);
          
          if (tDate >= sDate && tDate <= eDate) {
            return true;
          }
        }
      }
      return false;
    });
  }, [transactions, selectedPeriod, periods]);

  const budgetStatus = useMemo(() => {
    if (!selectedPeriod) return { targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 };
    const periodBudgets = budgets.filter((b: any) => b.periodId === selectedPeriod);
    const periodGlobal = globalBudgets.find((b: any) => b.periodId === selectedPeriod);
    
    const targetGlobalRaw = periodGlobal ? Number((periodGlobal as any).totalTargetAmount) : 0;
    const targetGlobal = targetGlobalRaw > 0 ? targetGlobalRaw : (monthlyBudget > 0 ? monthlyBudget : 0);
    const totalTeralokasi = periodBudgets.reduce((sum: number, b: any) => sum + getEffectiveBudgetAmount(b, targetGlobal), 0);
    const realisasiAktual = transactionsByPeriod.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    return { targetGlobal, totalTeralokasi, realisasiAktual, sisaSaldo: targetGlobal - realisasiAktual };
  }, [selectedPeriod, budgets, globalBudgets, transactionsByPeriod, monthlyBudget]);
  
  const isLoadingBudgets = loading;

  const activeGlobalBudget = useMemo(() => {
    return globalBudgets.find(gb => gb.periodId === selectedPeriod);
  }, [globalBudgets, selectedPeriod]);

  const { targetMonth, targetYear } = useMemo(() => {
    const periodObj = activePeriods.find(p => p.id === selectedPeriod || String(p.id) === String(selectedPeriod));
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
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const fetchSuggestions = async () => {
    setIsFetchingSuggestions(true);
    try {
      const expTxs = transactions.filter((t: any) => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
      const map: Record<string, number> = {};
      expTxs.forEach((tx: any) => {
         const cat = tx.category || (tx as any).categoryId || 'Lainnya';
         map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
      });
      const data = Object.keys(map).map(k => ({
         category_id: k,
         suggested_amount: Math.round(map[k] / 3) // Average loosely
      }));
      return { data };
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'pengeluaran');
  }, [categories]);

  const masterCategories = expenseCategories;

  const totalAllocatedAmount = useMemo(() => {
    const totalTarget = activeGlobalBudget?.totalTargetAmount || monthlyBudget || 0;
    return currentBudgets.reduce((sum, b) => sum + getEffectiveBudgetAmount(b, totalTarget), 0);
  }, [currentBudgets, activeGlobalBudget, monthlyBudget]);

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

  const budgetTransactions = useMemo(() => {
    if (!selectedBudgetForDetail?.categoryId || !selectedPeriod) return [];
    
    const categoryInfo = expenseCategories.find(c => String(c.id) === String(selectedBudgetForDetail.categoryId));
    
    const data = transactionsByPeriod.filter((t: any) => isCategoryMatch(t, selectedBudgetForDetail.categoryId, categoryInfo));
    console.log('Fetched Budget Transactions:', data);
    return data;
  }, [transactionsByPeriod, selectedPeriod, selectedBudgetForDetail, expenseCategories]);
  const detailSpentAmount = useMemo(() => {
    return budgetTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [budgetTransactions]);

  const isLoadingTransactions = false;

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
    // If there are existing budgets for the selected period, use them
    const allocatedBudgets = currentBudgets.filter(b => b.categoryId);
    
    if (allocatedBudgets.length > 0) {
      return allocatedBudgets.map(existingBudget => {
        const cat = expenseCategories.find(c => String(c.id) === String(existingBudget.categoryId));
        const value = existingBudget.value !== undefined && existingBudget.value !== null ? existingBudget.value : '';
        const type = existingBudget.type || 'amount';
        
        return {
          categoryId: existingBudget.categoryId,
          name: cat ? cat.name : 'Kategori Lain',
          amount: (value === 0 || value === '') ? '' : value,
          type: type,
          iconName: cat?.iconName || 'HelpCircle',
          isGenerated: false
        };
      });
    }
    
    // For a new budget (no existing categories allocated), start with one empty selectable row
    return [
      {
        categoryId: '',
        name: '',
        amount: '',
        type: 'amount' as const,
        iconName: 'HelpCircle',
        isGenerated: false
      }
    ];
  }, [expenseCategories, currentBudgets]);

  // 2. Form Setup using react-hook-form
  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      globalBudget: (activeGlobalBudget?.totalTargetAmount === 0 || !activeGlobalBudget?.totalTargetAmount) ? '' : activeGlobalBudget.totalTargetAmount,
      categories: defaultCategories
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "categories"
  });

  // Watch fields for interactive total sum inside Form UI
  const watchAllFields = watch();
  const watchedGlobalBudget = watchAllFields.globalBudget === '' ? 0 : (parseFloat(String(watchAllFields.globalBudget)) || 0);
  const watchedCategories = watchAllFields.categories || [];
  const currentAllocatedTotal = watchedCategories.reduce((sum: number, cat: any) => {
    const val = cat?.amount === '' ? 0 : (parseFloat(String(cat?.amount)) || 0);
    const nominal = cat?.type === 'percentage' ? (watchedGlobalBudget * val / 100) : val;
    return sum + nominal;
  }, 0);
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
        globalBudget: (activeGlobalBudget?.totalTargetAmount === 0 || !activeGlobalBudget?.totalTargetAmount) ? '' : activeGlobalBudget.totalTargetAmount,
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
            name: catInfo ? catInfo.name : (t('budgets.col_category_other') || 'Kategori Lain'),
            amount: item.suggested_amount > 0 ? item.suggested_amount : '',
            type: 'amount' as const,
            iconName: catInfo?.iconName || 'HelpCircle',
            isGenerated: true
          };
        });
        
        // Instantly inject historical amounts without massive re-renders
        setValue('categories', fetchedData, { shouldValidate: true });
        
        showToast(t('budgets.toast_est_success') || 'Anggaran berhasil diestimasikan berdasarkan riwayat 3 bulan terakhir!', 'success');
      }
    } catch (error: any) {

      showToast(t('budgets.toast_est_fail') || "Gagal mengambil rekomendasi anggaran.", 'error');
    }
  };

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    try {
      // 1. Force Numeric Types: Ensure the 'Target Anggaran Global' is a clean number
      const sanitizedGlobalBudget = data.globalBudget === '' ? 0 : (Number(data.globalBudget) || 0);

      // Explicitly update the user profile document first to keep monthlyBudget in sync on the user document
      await api.put('/user/profile', {
        monthlyBudget: sanitizedGlobalBudget
      });

      const existingGb = globalBudgets.find(gb => gb.periodId === selectedPeriod);
      const globalBudgetId = existingGb?.id;

      await onSaveGlobalBudget({
        periodId: selectedPeriod,
        totalTargetAmount: sanitizedGlobalBudget
      }, globalBudgetId);

      // 2. Save / Update Category Budgets
      const newBudgetsToCreate: any[] = [];
      const submittedCategoryIds = new Set(data.categories.map((cat: any) => String(cat.categoryId)));

      // Delete category budgets that were removed from the form list
      for (const existingBudget of currentBudgets) {
        if (existingBudget.id && existingBudget.categoryId && !submittedCategoryIds.has(String(existingBudget.categoryId))) {
          await onDeleteBudget(existingBudget.id);
        }
      }
      
      for (const cat of data.categories) {
        const existingBudget = currentBudgets.find(b => b.categoryId === cat.categoryId);
        
        // Parse Category Values: Explicitly parse as float/number
        const sanitizedCatAmount = cat.amount === '' ? 0 : (parseFloat(String(cat.amount)) || 0);
        const type = cat.type || 'amount';

        // Strip Extra Keys: Construct a new object containing ONLY the 5 allowed keys:
        // ['periodId', 'categoryId', 'type', 'value', 'createdAt']
        const categoryPayload = {
          periodId: selectedPeriod,
          categoryId: cat.categoryId,
          type: type,
          value: sanitizedCatAmount,
          createdAt: existingBudget?.createdAt || new Date().toISOString()
        };

        if (existingBudget?.id) {
          // Call onSaveBudget wrapper from App.tsx
          await onSaveBudget(categoryPayload, existingBudget.id);
        } else {
          newBudgetsToCreate.push(categoryPayload);
        }
      }

      if (newBudgetsToCreate.length > 0) {
        await onSaveBudget(newBudgetsToCreate);
      }

      // Refresh query states

      showToast(t('budgets.toast_save_success_all') || 'Seluruh konfigurasi anggaran berhasil disimpan!', 'success');
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message || t('budgets.toast_save_fail_all') || 'Gagal menyimpan anggaran.', 'error');
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
      showToast(t('budgets.toast_deleting') || 'Menghapus anggaran...', 'info');
      onDeleteBudget(budgetToDelete);
      showToast(t('budgets.toast_delete_success') || 'Anggaran kategori berhasil dihapus', 'success');
      setBudgetToDelete(null);
    } catch (e) {
      showToast(t('budgets.toast_delete_fail') || 'Gagal menghapus anggaran', 'error');
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
            {activePeriods.length === 0 && <option value="">{t('budgets.no_period_title') || 'Belum Ada Periode'}</option>}
            {activePeriods.map((p, idx) => (
              <option key={`${p.id}-${idx}`} value={p.id}>{getLocalizedPeriodName(p, i18n.language)}</option>
            ))}
          </select>
        </div>
      </div>

      {activePeriods.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center">
            <Target size={32} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-lg">{t('budgets.no_period_title') || 'Belum Ada Periode'}</h3>
            <p className="text-sm text-slate-500">{t('budgets.no_period_desc') || 'Anda perlu membuat Master Data Periode terlebih dahulu di menu Kategori / Master Data.'}</p>
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
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">{t('budgets.target_global_kpi') || 'Total Anggaran'}</span>
                <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                  {budgetStatus.targetGlobal > 0 ? formatIDR(budgetStatus.targetGlobal) : (t('budgets.target_global_not_defined') || 'Belum Ditentukan')}
                </h3>
              </div>
              <button 
                onClick={handleOpenForm}
                className="absolute top-4 right-4 p-1.5 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title={t('budgets.edit_global_budget') || "Atur Target Anggaran Global"}
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
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">{t('budgets.kpi_allocated') || 'Telah Dialokasikan'}</span>
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
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">{t('budgets.kpi_spent') || 'Total Terpakai'}</span>
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
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">{t('budgets.kpi_remaining') || 'Sisa Anggaran'}</span>
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
                  {t('budgets.status_allocation') || 'Status Alokasi'}
                </span>
                <span>
                  {formatIDR(totalAllocatedAmount)} / {formatIDR(activeGlobalBudget.totalTargetAmount)} ({Math.min(100, Math.round((totalAllocatedAmount / activeGlobalBudget.totalTargetAmount) * 100))}% {t('budgets.allocated') || 'Allocated'})
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
              <h3 className="font-bold text-slate-700">{t('budgets.budget_allocation_list') || 'Daftar Anggaran Kategori'} {currentPeriodObj ? `(${getLocalizedPeriodName(currentPeriodObj, i18n.language)})` : ''}</h3>
              <button
                onClick={handleOpenForm}
                disabled={activePeriods.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> {t('budgets.btn_set_budget') || 'Atur Anggaran'}
              </button>
            </div>

            {!activeGlobalBudget ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center">
                  <Info size={32} />
                </div>
                <div className="max-w-md">
                  <h3 className="font-bold text-slate-700 text-lg">{t('budgets.target_global_not_defined') || 'Target Anggaran Global Belum Ditentukan'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t('budgets.not_defined_desc') || 'Sesuai dengan pendekatan Top-Down Budgeting, silakan tentukan Target Anggaran Global periode ini terlebih dahulu sebelum mulai membagi anggaran ke dalam kategori.'}</p>
                </div>
                <button
                  onClick={handleOpenForm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-indigo-600/10 transition-all"
                >
                  {t('budgets.btn_set_global_now') || 'Set Target Anggaran Global Sekarang'}
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                {Array.from({ length: 4 }).map((_, i) => (
                  <BudgetSkeleton key={i} />
                ))}
              </div>
            ) : currentBudgets.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center">
                  <Target size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-lg">{t('budgets.no_category_budget_title') || 'Belum Ada Anggaran Kategori'}</h3>
                  <p className="text-sm text-slate-500">{t('budgets.no_category_budget_desc') || 'Target global terdefinisi. Silakan pecah target global menjadi alokasi kategori.'}</p>
                </div>
                <button
                  onClick={handleOpenForm}
                  className="mt-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                >
                  {t('budgets.btn_create_category_budget_now') || 'Buat Anggaran Kategori Sekarang'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {currentBudgets.map((budget) => {
                  const categoryInfo = expenseCategories.find(c => c.id === budget.categoryId) || {
                    id: '',
                    name: t('budgets.col_category_other') || 'Kategori Lain',
                    iconName: 'HelpCircle',
                    colorClass: 'bg-slate-100 text-slate-500'
                  };

                  const budgetAmount = getEffectiveBudgetAmount(budget, activeGlobalBudget?.totalTargetAmount || monthlyBudget || 0);
                  const spentAmount = transactionsByPeriod
                    .filter((t: any) => isCategoryMatch(t, budget.categoryId, categoryInfo))
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
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
                            {t('budgets.percentage_used', { percentage: actualPercentage }) || `${actualPercentage}% Terpakai`} ({formatIDR(spentAmount)})
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
                            {t('budgets.kpi_remaining') || 'Sisa Anggaran'}
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
                              setSingleEditBudget(budget);
                              setSingleEditModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-xl transition-all cursor-pointer"
                            title={t('budgets.edit_budget') || "Edit Anggaran"}
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
                            title={t('budgets.delete_budget') || "Hapus Anggaran"}
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
                            title={t('budgets.view_details') || "Lihat Detail Transaksi"}
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
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              if (!isSubmitting) {
                setIsFormOpen(false);
              }
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl max-w-lg w-full relative max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (!isSubmitting) {
                    setIsFormOpen(false);
                  }
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer z-10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>

              <div className="shrink-0">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {t('budgets.modal_title')}
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  {t('budgets.modal_desc')}
                </p>

              </div>

              <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 flex flex-col overflow-hidden space-y-4">
                
                {/* Scrollable form body */}
                <div data-lenis-prevent="true" className="flex-1 overflow-y-auto space-y-4 pr-1">
                  
                  {/* Period Display */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('BUDGETS.COL_PERIOD')}</span>
                    <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm">
                      {currentPeriodObj ? getLocalizedPeriodName(currentPeriodObj, i18n.language) : (t('budgets.select_period_placeholder') || 'Pilih Periode')}
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
                      <span>{isFetchingSuggestions ? (t('budgets.estimating_loading') || 'Menghitung Estimasi...') : (t('budgets.btn_auto_generate') || '✨ Auto-Generate (Berdasarkan Riwayat)')}</span>
                    </button>
                  </div>

                  {/* Target Anggaran Global */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('budgets.col_global_target')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-sm">Rp</span>
                      </div>
                      <Controller
                        name="globalBudget"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <NumericFormat
                            value={value as string | number}
                            onValueChange={(values) => {
                              onChange(values.value);
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            allowNegative={false}
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-base text-slate-800"
                            placeholder="0"
                          />
                        )}
                      />
                    </div>
                    {errors.globalBudget && (
                      <p className="text-[11px] text-red-500 font-bold">{errors.globalBudget.message}</p>
                    )}
                  </div>

                  {/* Scrollable Categories List mapped via useFieldArray */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">{t('budgets.col_category_allocation')}</label>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{t('BUDGETS.COL_AMOUNT_PERCENTAGE')}</span>
                    </div>

                    <div data-lenis-prevent="true" className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {fields.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          {t('budgets.empty_allocated_categories') || 'Belum ada anggaran kategori. Silakan tambahkan kategori secara manual atau klik Auto-Generate.'}
                        </div>
                      )}
                      {fields.map((field, index) => {
                        const currentCategoryId = watchedCategories[index]?.categoryId;
                        const currentCatInfo = expenseCategories.find(c => String(c.id) === String(currentCategoryId));
                        const currentIconName = currentCatInfo?.iconName || watchedCategories[index]?.iconName;
                        const currentColorClass = currentCatInfo?.colorClass || 'bg-slate-100 text-slate-500';
                        const isGenerated = watchedCategories[index]?.isGenerated;
                        
                        return (
                          <div key={field.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                            <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentColorClass}`}>
                                {renderCategoryIcon(currentIconName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                {isGenerated ? (
                                  <div className="w-full text-xs font-bold text-slate-500 bg-slate-100/60 border border-slate-200/50 rounded-lg p-2 select-none cursor-not-allowed truncate">
                                    {currentCatInfo?.name || watchedCategories[index]?.name || (t('budgets.col_category_other') || 'Kategori Lain')}
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
                                    <option value="" disabled>{t('budgets.select_category')}</option>
                                    {masterCategories
                                      .filter(c => {
                                        if (String(c.id) === String(currentCategoryId)) return true;
                                        return !watchedCategories?.some((wc: any, wcIdx: number) => wcIdx !== index && String(wc?.categoryId) === String(c.id));
                                      })
                                      .map((c, cIdx) => (
                                        <option key={`${c.id}-${cIdx}`} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-row items-start sm:items-center justify-between gap-2 w-full sm:w-auto shrink-0">
                              <div className="flex flex-col items-start sm:items-end gap-0.5 w-full flex-1 sm:w-44">
                                <div className="flex items-center gap-1.5 w-full">
                                {/* Type Toggle: Rp / % */}
                                <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue(`categories.${index}.type` as const, 'amount');
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                      (watchedCategories[index]?.type || 'amount') === 'amount'
                                        ? 'bg-white text-indigo-600 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title={t('budgets.amount_type_tooltip') || "Nominal Rupiah"}
                                  >
                                    Rp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue(`categories.${index}.type` as const, 'percentage');
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider transition-all cursor-pointer ${
                                      watchedCategories[index]?.type === 'percentage'
                                        ? 'bg-white text-indigo-600 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title={t('budgets.percentage_type_tooltip') || "Persentase Global"}
                                  >
                                    %
                                  </button>
                                </div>

                                <div className="relative flex-1">
                                  <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-extrabold text-[9px]">
                                      {watchedCategories[index]?.type === 'percentage' ? '%' : 'Rp'}
                                    </span>
                                  </div>
                                  <Controller
                                    name={`categories.${index}.amount` as const}
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                      <NumericFormat
                                        value={value as string | number}
                                        onValueChange={(values) => {
                                          onChange(values.value);
                                        }}
                                        thousandSeparator={watchedCategories[index]?.type === 'percentage' ? false : "."}
                                        decimalSeparator={watchedCategories[index]?.type === 'percentage' ? "." : ","}
                                        allowNegative={false}
                                        isAllowed={(values) => {
                                          if (watchedCategories[index]?.type === 'percentage') {
                                            const num = parseFloat(values.value);
                                            if (!isNaN(num) && num > 100) return false;
                                          }
                                          return true;
                                        }}
                                        className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-800 text-right"
                                        placeholder="0"
                                      />
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Dynamic Preview for Percentage Mode */}
                              {watchedCategories[index]?.type === 'percentage' && (
                                <span className="text-[9px] text-slate-500 font-semibold pr-1">
                                  {t('budgets.percentage_equivalent') || 'Setara Rp'} {Math.round((watchedGlobalBudget * (parseFloat(String(watchedCategories[index]?.amount)) || 0)) / 100).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                              title={t('budgets.delete_row_tooltip') || "Hapus Baris"}
                            >
                              <X size={16} className="sm:w-[14px] sm:h-[14px]" />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Manual Addition button */}
                    <div className="flex justify-start pt-1">
                      <button
                        type="button"
                        onClick={() => append({ categoryId: '', amount: '', iconName: '', isGenerated: false })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{t('budgets.btn_add_category_row')}</span>
                      </button>
                    </div>

                  </div>

                </div>

                {/* Form Footer Status & Action buttons */}
                <div className="shrink-0 border-t border-slate-100 pt-3 space-y-3">
                  
                  {/* Dynamic allocation sum summary */}
                  <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-[11px] font-bold">
                    <div>
                      <span className="text-slate-400 block uppercase text-[9px] tracking-wider">{t('budgets.kpi_allocated') || 'Total Teralokasi'}</span>
                      <span className="text-slate-700 text-xs font-black">{formatIDR(currentAllocatedTotal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block uppercase text-[9px] tracking-wider">{t('BUDGETS.COL_REMAINING_TO_ALLOCATE')}</span>
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
                      disabled={isSubmitting}
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 py-2.5 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                    >
                      {t('budgets.btn_cancel')}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || sisaUntukDialokasikan < 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-bold text-xs transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                          <span>{t('budgets.saving_loading') || 'Menyimpan...'}</span>
                        </>
                      ) : (
                        t('budgets.btn_save_budget')
                      )}
                    </button>
                  </div>

                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <EditSingleBudgetModal
        isOpen={singleEditModalOpen}
        onClose={() => {
          setSingleEditModalOpen(false);
          setSingleEditBudget(null);
        }}
        budget={singleEditBudget}
        category={categories.find(c => c.id === singleEditBudget?.categoryId)}
        onSave={handleSaveSingleBudget}
      />

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
                <h3 className="font-bold text-lg text-slate-900">{t('confirm.delete.title') || 'Konfirmasi Hapus'}</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                {t('budgets.delete_modal_desc') || 'Apakah Anda yakin ingin menghapus alokasi anggaran untuk kategori ini? Dana akan dikembalikan ke Sisa Anggaran Global.'}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setBudgetToDelete(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t('budgets.btn_cancel') || 'Batal'}
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={false}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {t('confirm.btn.yes_delete') || 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <EditSingleBudgetModal
        isOpen={singleEditModalOpen}
        onClose={() => {
          setSingleEditModalOpen(false);
          setSingleEditBudget(null);
        }}
        budget={singleEditBudget}
        category={categories.find(c => c.id === singleEditBudget?.categoryId)}
        onSave={handleSaveSingleBudget}
      />

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
                const categoryName = categoryInfo ? categoryInfo.name : (t('budgets.col_category_other') || 'Kategori');
                const periodName = currentPeriodObj ? getLocalizedPeriodName(currentPeriodObj, i18n.language) : '';

                return (
                  <div className="flex items-center gap-3 pr-10 mb-4 pb-3 border-b border-slate-100 shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${categoryInfo?.colorClass || 'bg-slate-100 text-slate-600'}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                        {t('budgets.detail_modal_title') || 'Detail Anggaran'} {categoryName}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold">
                        {t('budgets.col_period') || 'Periode'}: {periodName}
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
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">{t('budgets.target_global_kpi') || 'Target Anggaran'}</span>
                      <span className="font-extrabold text-slate-800 text-xs md:text-sm tabular-nums">
                        {formatIDR(getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">{t('budgets.kpi_spent') || 'Total Realisasi'}</span>
                      <span className="font-extrabold text-red-600 text-xs md:text-sm tabular-nums">
                        {formatIDR(detailSpentAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">{t('budgets.kpi_remaining') || 'Sisa Anggaran'}</span>
                      <span className={`font-extrabold text-xs md:text-sm tabular-nums ${
                        getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0) - (detailSpentAmount) < 0 
                          ? 'text-red-500 font-black' 
                          : 'text-emerald-600'
                      }`}>
                        {formatIDR(getEffectiveBudgetAmount(selectedBudgetForDetail, activeGlobalBudget?.totalTargetAmount || 0) - (detailSpentAmount))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Transaction Table */}
              <div data-lenis-prevent="true" className="flex-1 overflow-y-auto max-h-[50vh] border border-slate-100 rounded-2xl">
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
                        <th className="p-3">{t('budgets.col_date') || 'Tanggal'}</th>
                        <th className="p-3">{t('budgets.col_subcategory') || 'Sub-Kategori'}</th>
                        <th className="p-3">{t('budgets.col_notes') || 'Catatan'}</th>
                        <th className="p-3">{t('budgets.col_source_account') || 'Sumber Dana'}</th>
                        <th className="p-3 text-right">{t('budgets.col_amount') || 'Nominal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                            {t('budgets.no_transactions_found') || 'Tidak ada transaksi pengeluaran di kategori ini untuk periode ini.'}
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
                  {t('budgets.btn_close_detail') || 'Tutup Detail'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <EditSingleBudgetModal
        isOpen={singleEditModalOpen}
        onClose={() => {
          setSingleEditModalOpen(false);
          setSingleEditBudget(null);
        }}
        budget={singleEditBudget}
        category={categories.find(c => c.id === singleEditBudget?.categoryId)}
        onSave={handleSaveSingleBudget}
      />
    </div>
  );
}
