import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { startOfMonth, subMonths, addMonths, isToday, isYesterday, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import GoldPriceTracker from './GoldPriceTracker';
import BudgetMonitor from './BudgetMonitor';
import { Category } from '@/types';
import { getActiveDb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { subscribeToCollection } from '@/services/dbServices';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { curveCardinal } from 'd3-shape';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, 
  Calendar, AlertTriangle, ShieldCheck, CreditCard, Copy, Check,
  ChevronLeft, ChevronRight, Search, Info, MessageSquare,
  Award, HelpCircle, Settings2, X, Repeat, Plus
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  user: any;
  dbUser?: any;
  categories: Category[];
  onOpenForm: (type: 'pemasukan' | 'pengeluaran') => void;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets') => void;
  transactions?: any[];
  budgets?: any[];
  periods?: any[];
  globalBudgets?: any[];
  budgetAllocations?: any[];
  accounts?: any[];
  onSaveGlobalBudget?: (globalBudget: any, id?: string) => Promise<void>;
}

// Indonesian month names for dropdown
const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

const monthMapIndo: { [key: string]: string } = {
  'Jan': 'Januari',
  'Feb': 'Februari',
  'Mar': 'Maret',
  'Apr': 'April',
  'Mei': 'Mei',
  'Jun': 'Juni',
  'Jul': 'Juli',
  'Agu': 'Agustus',
  'Sep': 'September',
  'Okt': 'Oktober',
  'Nov': 'November',
  'Des': 'Desember'
};

// Shared utility function for mathematically rounded percentages
export const formatPercentage = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
};

export default function Dashboard({ 
  user,
  dbUser,
  categories, 
  onOpenForm, 
  setActiveTab,
  transactions: initialTransactions = [],
  budgets = [],
  periods = [],
  globalBudgets = [],
  budgetAllocations = [],
  accounts = [],
  onSaveGlobalBudget
}: DashboardProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>(initialTransactions);
  const [localSummary, setLocalSummary] = useState<any>(null);

  const currentUserData = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      displayName: dbUser?.displayName || user.displayName || '',
      photoURL: dbUser?.photoURL || user.photoURL || '',
      phoneNumber: dbUser?.phoneNumber || user.phoneNumber || ''
    };
  }, [user, dbUser]);
  const currentDate = new Date();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  
  const hasInitializedPeriod = useRef(false);
  const [dashboardDate, setDashboardDate] = useState<Date>(startOfMonth(new Date()));
  const selectedMonth = dashboardDate.getMonth() + 1;
  const selectedYear = dashboardDate.getFullYear();

  const activePeriodId = useMemo(() => {
    const targetMonthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    const targetPrefix = `${selectedYear}-${targetMonthStr}`;
    const matchingPeriod = periods.find((p: any) => {
      if (p.startDate && p.startDate.startsWith(targetPrefix)) return true;
      if (p.name && (p.name || '').toLowerCase().includes(targetPrefix)) return true;
      return false;
    });
    return matchingPeriod?.id || periods[0]?.id || null;
  }, [periods, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    let unsubTransactions: any;
    let unsubSummary: any;

    unsubTransactions = subscribeToCollection(user.uid, 'transactions', (data) => {
      setTransactions(data);
      setLoading(false);
    });

    if (activePeriodId) {
      const summaryRef = doc(getActiveDb(), `users/${user.uid}/summaries/${activePeriodId}`);
      unsubSummary = onSnapshot(summaryRef, (docSnap) => {
        if (docSnap.exists()) {
          setLocalSummary(docSnap.data());
        } else {
          setLocalSummary({ totalPemasukan: 0, totalPengeluaran: 0 });
        }
      }, (error) => {
        console.error('Error fetching summary:', error);
      });
    } else {
      setLocalSummary({ totalPemasukan: 0, totalPengeluaran: 0 });
    }

    return () => {
      if (unsubTransactions) unsubTransactions();
      if (unsubSummary) unsubSummary();
    };
  }, [user?.uid, activePeriodId]);

  // Calculate cashflow chart data locally
  const cashflowStatsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const result = months.map(m => ({ month: m, income: 0, expense: 0 }));
    
    transactions.forEach(tx => {
      if (!tx.date) return;
      const date = new Date(tx.date);
      if (date.getFullYear() === selectedYear) {
        const monthIdx = date.getMonth();
        if (String(tx.type) === 'Cr' || tx.type?.toLowerCase() === 'pemasukan') {
          result[monthIdx].income += Number(tx.amount || 0);
        } else if (String(tx.type) === 'Dr' || tx.type?.toLowerCase() === 'pengeluaran') {
          result[monthIdx].expense += Number(tx.amount || 0);
        }
      }
    });
    return result;
  }, [transactions, selectedYear]);
  

  
  // Calculate expense distribution locally for the selected month and year
  const rawExpenseDistribution = useMemo(() => {
    const expTxs = transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (String(t.type) === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
    });
    
    const map: Record<string, number> = {};
    expTxs.forEach(tx => {
       const cat = tx.category || 'Lainnya';
       map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
    });
    
    const distData = Object.keys(map).map(k => ({
       category: k,
       amount: map[k]
    }));
    
    return distData.sort((a,b) => b.amount - a.amount);
  }, [transactions, selectedMonth, selectedYear]);
  

  const handlePrevMonth = () => {
    setDashboardDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setDashboardDate(prev => addMonths(prev, 1));
  };

  const activeGlobalBudget = useMemo(() => {
    if (!activePeriodId) return null;
    return globalBudgets.find((gb: any) => gb.periodId === activePeriodId.toString() || gb.periodId === Number(activePeriodId));
  }, [globalBudgets, activePeriodId]);

  const monthlyBudget = activeGlobalBudget ? Number((activeGlobalBudget as any).totalTargetAmount) : ((budgets[0] as any)?.amount || 0);
  const activeBudgetAllocations = useMemo(() => {
    if (!activePeriodId) return [];
    return budgetAllocations.filter((b: any) => b.periodId === activePeriodId.toString() || b.periodId === Number(activePeriodId));
  }, [budgetAllocations, activePeriodId]);




  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(monthlyBudget.toString());
  
  
  useEffect(() => {
    setTempBudget(monthlyBudget.toString());
  }, [monthlyBudget]);

      
  // Modals for extra details
  const [showRetirementModal, setShowRetirementModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatFeedback, setChatFeedback] = useState('');
  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = useState({
    cashflowStats: true,
    expenseDistribution: true,
    preciousMetals: true,
    recentTransactions: true,
    budgetMonitor: true
  });

  // Retirement Calculator State
  const [calcCurrentAge, setCalcCurrentAge] = useState<number>(25);
  const [calcRetireAge, setCalcRetireAge] = useState<number>(55);
  const [calcMonthlySavings, setCalcMonthlySavings] = useState<string>('2000000');
  const [calcReturnRate, setCalcReturnRate] = useState<number>(8);
  const [calcResult, setCalcResult] = useState<{
    totalWealth: number;
    totalPrincipal: number;
    totalInterest: number;
  } | null>(null);

  // Dynamic Greeting based on Local Time
  const greetingText = useMemo(() => {
    const hours = currentDate.getHours();
    if (hours >= 5 && hours < 11) return t('dashboard.greeting_morning');
    if (hours >= 11 && hours < 15) return t('dashboard.greeting_afternoon');
    if (hours >= 15 && hours < 19) return t('dashboard.greeting_evening');
    return t('dashboard.greeting_night');
  }, [t]);

  // Format Display Name or email
  const displayUserName = useMemo(() => {
    if (currentUserData?.displayName) return currentUserData.displayName;
    if (user?.isAnonymous) return t('user_guest');
    if (user?.email) return user.email.split('@')[0];
    return t('user_guest');
  }, [user, currentUserData, t]);

  // Available years from transactions or current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentDate.getFullYear()]);
    transactions.forEach(t => {
      const year = new Date(t.date).getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Filtered transactions for the selected month/year
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return (tDate.getMonth() + 1) === selectedMonth && tDate.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const budgetAlerts = useMemo(() => {
    const alerts: { categoryName: string, spent: number, limit: number, percentage: number }[] = [];
    
    activeBudgetAllocations.forEach((alloc: any) => {
      const category = categories.find(c => c.id === alloc.categoryId);
      if (!category) return;
      
      const spent = monthlyTransactions
        .filter(t => t.type === 'pengeluaran' && t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const limit = alloc.calculatedAmount || 0;
      if (limit > 0) {
        const percentage = (spent / limit) * 100;
        if (percentage >= 80) {
          alerts.push({
            categoryName: category.name,
            spent,
            limit,
            percentage
          });
        }
      }
    });

    return alerts.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  }, [activeBudgetAllocations, categories, monthlyTransactions]);

  // Financial Metrics calculations
  const { totalIncome, totalExpense } = useMemo(() => {
    if (localSummary) {
      return {
        totalIncome: localSummary.totalPemasukan || 0,
        totalExpense: localSummary.totalPengeluaran || 0
      };
    }

    let income = 0;
    let expense = 0;
    monthlyTransactions.forEach(t => {
      if (t.type === 'pemasukan') {
        income += t.amount;
      } else if (t.type === 'pengeluaran') {
        expense += t.amount;
      }
    });
    return {
      totalIncome: income,
      totalExpense: expense
    };
  }, [monthlyTransactions, localSummary]);

  const netSavingsAndBalance = useMemo(() => {
    // 1. Calculate Base Balance: Filter for active accounts with 'includeInNetWorth === true' and sum initial balances (Saldo Awal, saved as 'balance').
    const activeAccounts = accounts.filter((acc: any) => acc.includeInNetWorth === true);
    const baseBalance = activeAccounts.reduce((sum: number, acc: any) => {
      const initial = acc.balance !== undefined ? acc.balance : (acc.initialBalance || 0);
      return sum + Number(initial || 0);
    }, 0);

    // 2. Calculate Cash Flow Adjustments: Find all transactions linked to active accounts, summing income (pemasukan) and subtracting expenses (pengeluaran).
    const activeAccountIds = new Set(activeAccounts.map((acc: any) => String(acc.id)));
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      const isLinkedToActiveAccount = t.accountId && activeAccountIds.has(String(t.accountId));
      if (isLinkedToActiveAccount) {
        if (t.type === 'pemasukan') {
          totalIncome += Number(t.amount || 0);
        } else if (t.type === 'pengeluaran') {
          totalExpense += Number(t.amount || 0);
        }
      }
    });

    // 3. Compute Net Worth: Base Balance + Total Income - Total Expenses
    return baseBalance + totalIncome - totalExpense;
  }, [accounts, transactions]);

  const finalDisplayIncome = useMemo(() => {
    return totalIncome;
  }, [totalIncome]);

  const finalDisplayExpense = useMemo(() => {
    return totalExpense;
  }, [totalExpense]);

  // Monthly trend of cashflow based on database reports
  const chartData = useMemo(() => {
    return cashflowStatsData.map((d: any) => ({
      tanggal: d.month,
      Pemasukan: Number(d.income) || 0,
      Pengeluaran: Number(d.expense) || 0
    }));
  }, [cashflowStatsData]);

  // Expense breakdown by category for circular chart and legend list
  const expenseCategoriesBreakdown = useMemo(() => {
    let rawMapped = rawExpenseDistribution
      .map((item: any) => ({
        name: item.category,
        value: Number(item.amount) || 0
      }))
      .filter((i: any) => i.value > 0);

    // 1. Sort descending
    rawMapped.sort((a: any, b: any) => b.value - a.value);

    // 2. Group into 'Lainnya' if more than 5
    if (rawMapped.length > 5) {
      const top5 = rawMapped.slice(0, 5);
      const others = rawMapped.slice(5);
      const othersValue = others.reduce((sum: number, curr: any) => sum + curr.value, 0);
      if (othersValue > 0) {
        top5.push({
          name: 'Lainnya',
          value: othersValue
        });
      }
      rawMapped = top5;
    }

    const total = rawMapped.reduce((sum: number, item: any) => sum + item.value, 0);
    const fallbackColors = ['#3b82f6', '#f97316', '#ef4444', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];
    
    let mapped = rawMapped.map((item: any, idx: number) => {
      let catColor = '#94a3b8'; // default neutral color for Lainnya
      if (item.name !== 'Lainnya') {
        const cat = categories.find(c => c.name === item.name || c.id === (item.name || '').toLowerCase());
        catColor = cat?.colorHex || cat?.color_hex || fallbackColors[idx % fallbackColors.length];
      }
      
      const percentage = total > 0 ? formatPercentage(item.value, total) : 0;
      return {
        name: item.name,
        value: item.value,
        color: catColor,
        percentage
      };
    });

    // Make sure the integer percentage values sum up to exactly 100%
    if (mapped.length > 0 && total > 0) {
      let sumOfRounded = 0;
      const roundedItems = mapped.map(item => {
        const r = formatPercentage(item.value, total);
        sumOfRounded += r;
        return { ...item, roundedPercentage: r };
      });
      
      const diff = 100 - sumOfRounded;
      if (diff !== 0) {
        // Adjust the item with the largest percentage to prevent distortion
        let maxIndex = 0;
        let maxValue = -1;
        roundedItems.forEach((item, idx) => {
          if (item.value > maxValue) {
            maxValue = item.value;
            maxIndex = idx;
          }
        });
        roundedItems[maxIndex].roundedPercentage += diff;
      }
      return roundedItems.map(item => ({
        ...item,
        percentage: item.roundedPercentage // override with exact adjusted percentage for displays
      }));
    }

    return mapped;
  }, [rawExpenseDistribution, categories]);

  const { topCategoryInfo, topCategoryPercentage } = useMemo(() => {
    if (!expenseCategoriesBreakdown || expenseCategoriesBreakdown.length === 0) {
      return { topCategoryInfo: null, topCategoryPercentage: 0 };
    }
    const sorted = [...expenseCategoriesBreakdown].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    return {
      topCategoryInfo: top,
      topCategoryPercentage: top.percentage
    };
  }, [expenseCategoriesBreakdown]);

  const matchedCategory = useMemo(() => {
    if (!topCategoryInfo) return null;
    return categories.find(c => c.name.toLowerCase() === topCategoryInfo.name.toLowerCase() || c.id === topCategoryInfo.name.toLowerCase());
  }, [topCategoryInfo, categories]);

  const categoryIcon = useMemo(() => {
    if (matchedCategory?.iconName) {
      return matchedCategory.iconName;
    }
    const name = (topCategoryInfo?.name || '').toLowerCase();
    if (name.includes('makan')) return 'Utensils';
    if (name.includes('belanja')) return 'ShoppingBag';
    if (name.includes('tagihan') || name.includes('utilitas')) return 'Receipt';
    if (name.includes('hiburan') || name.includes('nongkrong')) return 'Sparkles';
    if (name.includes('sehat')) return 'HeartPulse';
    if (name.includes('didik') || name.includes('kuliah')) return 'GraduationCap';
    return 'ShoppingBag';
  }, [matchedCategory, topCategoryInfo]);

  const categoryColorClass = useMemo(() => {
    if (matchedCategory?.colorClass) {
      return matchedCategory.colorClass;
    }
    const name = (topCategoryInfo?.name || '').toLowerCase();
    if (name.includes('makan')) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (name.includes('belanja')) return 'text-purple-600 bg-purple-50 border-purple-100';
    if (name.includes('tagihan') || name.includes('utilitas')) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (name.includes('hiburan') || name.includes('nongkrong')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-indigo-600 bg-indigo-50 border-indigo-100';
  }, [matchedCategory, topCategoryInfo]);

  
  // Handle budget edit submit
  const handleSaveBudget = async () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val >= 0) {
      if (activeGlobalBudget && onSaveGlobalBudget) {
        await onSaveGlobalBudget({ ...activeGlobalBudget, totalTargetAmount: val }, activeGlobalBudget.id);
      } else if (onSaveGlobalBudget && activePeriodId) {
        await onSaveGlobalBudget({ periodId: activePeriodId, totalTargetAmount: val, createdAt: new Date().toISOString() });
      }
      setEditingBudget(false);
  const handleCopyCard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSearchSubmit = (e: any) => { e.preventDefault(); };
    }
  };

  // Clipboard copy
  const handleCopyCard = () => {
    navigator.clipboard.writeText('6549732998212472');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  // Top 5 recent transactions
  const topRecentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
          return dateB - dateA;
        }
        
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        
        return (b.id || '').localeCompare(a.id || '');
      })
      .slice(0, 5);
  }, [transactions]);

  const getCategoryIconAndColor = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('makan') || cat.includes('food')) return { Icon: LucideIcons.Utensils, colorClass: 'bg-orange-100 text-orange-600' };
    if (cat.includes('transport')) return { Icon: LucideIcons.Car, colorClass: 'bg-blue-100 text-blue-600' };
    if (cat.includes('belanja') || cat.includes('shop')) return { Icon: LucideIcons.ShoppingCart, colorClass: 'bg-pink-100 text-pink-600' };
    if (cat.includes('tagihan') || cat.includes('bill') || cat.includes('utilitas')) return { Icon: LucideIcons.Receipt, colorClass: 'bg-purple-100 text-purple-600' };
    if (cat.includes('hiburan') || cat.includes('entertain')) return { Icon: LucideIcons.Film, colorClass: 'bg-yellow-100 text-yellow-600' };
    if (cat.includes('kesehatan') || cat.includes('health')) return { Icon: LucideIcons.HeartPulse, colorClass: 'bg-rose-100 text-rose-600' };
    if (cat.includes('gaji') || cat.includes('income') || cat.includes('pemasukan')) return { Icon: LucideIcons.Wallet, colorClass: 'bg-emerald-100 text-emerald-600' };
    if (cat.includes('transfer')) return { Icon: LucideIcons.ArrowRightLeft, colorClass: 'bg-slate-100 text-slate-600' };
    return { Icon: LucideIcons.CircleDollarSign, colorClass: 'bg-indigo-100 text-indigo-600' };
  };

  const humanizeDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return 'Hari Ini';
      if (isYesterday(d)) return 'Kemarin';
      return format(d, 'dd MMM yyyy', { locale: idLocale });
    } catch {
      return dateStr;
    }
  };
  // Format IDR Helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format IDR Decimals helper (mimics visual separation in screenshot)
  const formatIDRWithSplit = (num: number) => {
    const mainStr = formatIDR(num);
    return {
      main: mainStr,
      cents: ',00'
    };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fullMonthName = monthMapIndo[label] || label;
      return (
        <div className="bg-white p-3.5 border border-gray-100 rounded-2xl shadow-xl">
          <p className="text-xs font-black text-slate-900 mb-1.5">Bulan: {fullMonthName}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
              <span className="text-gray-500 font-medium">{entry.name}:</span>
              <span className="font-extrabold text-slate-900 ml-auto">{formatIDR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Percentage budget spent
  const budgetPercentage = useMemo(() => {
    if (monthlyBudget <= 0) return 0;
    return Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100);
  }, [totalExpense, monthlyBudget]);

  // Retirement calculations
  const calculateRetirementProjections = () => {
    const monthlyRate = (calcReturnRate / 100) / 12;
    const totalMonths = (calcRetireAge - calcCurrentAge) * 12;
    const savings = parseFloat(calcMonthlySavings) || 0;

    if (totalMonths <= 0 || savings <= 0) return;

    let accumulated = 0;
    let principal = 0;

    for (let m = 0; m < totalMonths; m++) {
      accumulated = (accumulated + savings) * (1 + monthlyRate);
      principal += savings;
    }

    setCalcResult({
      totalWealth: Math.round(accumulated),
      totalPrincipal: Math.round(principal),
      totalInterest: Math.round(accumulated - principal)
    });
  };

  // Trigger search filters
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('transactions');
    }
  };

  const balanceParts = formatIDRWithSplit(netSavingsAndBalance);
  const monthlyIncomeParts = formatIDRWithSplit(finalDisplayIncome);
  const monthlyExpenseParts = formatIDRWithSplit(finalDisplayExpense);

  if (loading) {
    return (
      <div className="space-y-6 font-sans select-none pb-12 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 border border-gray-100" />
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded-md mb-2.5" />
              <div className="h-7 w-40 bg-gray-200 rounded-md" />
            </div>
          </div>
          <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="h-44 bg-gray-100 rounded-[24px]" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-100 rounded-[24px]" />
              <div className="h-32 bg-gray-100 rounded-[24px]" />
            </div>
          </div>
          <div className="lg:col-span-2 h-[328px] bg-gray-100 rounded-[24px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 h-[420px] bg-gray-100 rounded-[24px]" />
          <div className="h-[420px] bg-gray-100 rounded-[24px]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 font-sans select-none pb-12"
    >
      
      {/* 1. Header Row (Avatar, Greeting, Subtitle, and Month Navigator) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        {/* Left Side: Avatar & Personalized Greeting */}
        <div className="flex items-center gap-4">
          {currentUserData?.photoURL ? (
            <img 
              src={currentUserData.photoURL} 
              alt={displayUserName} 
              className="h-12 w-12 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-sm tracking-tight border border-indigo-100 shrink-0">
              {displayUserName ? displayUserName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
              {greetingText}, <span className="font-extrabold">{displayUserName}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">{t('dashboard.subtitle')}</p>
          </div>
        </div>

        {/* Right Side: Month Navigator */}
        <div className="flex items-center gap-1 bg-white border border-gray-200/80 rounded-2xl p-1 shadow-xs shrink-0 select-none">
          <button 
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="p-1.5 hover:bg-gray-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1.5 px-2">
            <Calendar size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-bold text-slate-850 whitespace-nowrap">
              {MONTHS[selectedMonth - 1]?.label} {selectedYear}
            </span>
            {selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear() && (
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold border border-indigo-100/30 shrink-0">
                {t('dashboard.month_this')}
              </span>
            )}
          </div>

          <button 
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="p-1.5 hover:bg-gray-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

                  {/* 1. Static Hero Section (Top): 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Total Kekayaan Bersih (Net Worth) */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-6 rounded-3xl border-none shadow-lg shadow-indigo-500/30 flex flex-col justify-between h-full min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">{t('dashboard.net_worth')}</span>
              <div className="flex items-baseline gap-0.5 tabular-nums tracking-tight">
                <span className="text-3xl font-semibold text-white privacy-value">{balanceParts.main}</span>
                <span className="text-[11px] font-bold text-indigo-200/80 privacy-value">{balanceParts.cents}</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-white/10 text-white rounded-2xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-3">
            {netSavingsAndBalance === 0 ? (
              <button onClick={() => setActiveTab('categories')} className="w-full py-2.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm border-none cursor-pointer">
                <Plus size={14} strokeWidth={2.5} /> {t('dashboard.add_first_account')}
              </button>
            ) : (
              <>
                <button onClick={() => onOpenForm('pemasukan')} className="flex-1 py-2.5 bg-transparent hover:bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <ArrowUpRight size={14} strokeWidth={2.5} /> {t('dashboard.income')}
                </button>
                <button onClick={() => onOpenForm('pengeluaran')} className="flex-1 py-2.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm border-none cursor-pointer">
                  <ArrowDownRight size={14} strokeWidth={2.5} /> {t('dashboard.expense')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Arus Kas (Income vs Expense) */}
        <div className="bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between h-full min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('dashboard.cashflow')}</span>
                {!(finalDisplayIncome === 0 && finalDisplayExpense === 0) && (
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    finalDisplayExpense > finalDisplayIncome 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {finalDisplayExpense > finalDisplayIncome ? t('dashboard.deficit') : t('dashboard.surplus')}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-bold block">{t('dashboard.total_income')}</span>
                  <div className="flex items-baseline gap-0.5 tabular-nums">
                    <span className="text-xl font-semibold text-emerald-600 tracking-tight privacy-value">{monthlyIncomeParts.main}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-500 font-bold block">{t('dashboard.total_expense')}</span>
                  <div className="flex items-baseline justify-end gap-0.5 tabular-nums">
                    <span className="text-xl font-semibold text-rose-500 tracking-tight privacy-value">-{monthlyExpenseParts.main}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-50">
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${finalDisplayIncome === 0 ? 0 : Math.min((finalDisplayExpense / finalDisplayIncome) * 100, 100)}%` }}
                className="h-full bg-rose-500 transition-all duration-500 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold">
              <span className="text-gray-500">{t('dashboard.usage_ratio')}</span>
              <span className={finalDisplayIncome === 0 && finalDisplayExpense === 0 ? "text-slate-400" : "text-rose-600"}>
                {finalDisplayIncome > 0 ? Math.round((finalDisplayExpense / finalDisplayIncome) * 100) : 0}% {t('dashboard.used')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Peringatan Anggaran (Budget Warning) / Pengeluaran Terbesar (Top Expense Fallback) */}
        <div className="bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col h-full min-h-[180px]">
          {budgetAlerts.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                 <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('dashboard.budget_warning')}</span>
                  <p className="text-[10px] font-medium text-gray-500">{t('dashboard.budget_warning_desc')}</p>
                 </div>
                 <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-3">
                {budgetAlerts.map((alert, idx) => {
                  const isBreached = alert.percentage >= 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700 truncate mr-2">{alert.categoryName}</span>
                        <span className={isBreached ? "text-rose-600 shrink-0" : "text-amber-600 shrink-0"}>
                          {Math.round(alert.percentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                          className={`h-full transition-all duration-500 rounded-full ${isBreached ? 'bg-rose-500' : 'bg-amber-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                 <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('dashboard.top_expense')}</span>
                  <p className="text-[10px] font-medium text-gray-500">{t('dashboard.top_expense_desc')}</p>
                 </div>
                 <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingDown size={16} />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between space-y-3">
                {topCategoryInfo ? (
                  <>
                    <div className="flex items-center gap-3">
                      {/* Icon container using matching dynamic category colors */}
                      <div className={`h-11 w-11 rounded-2xl border flex items-center justify-center shrink-0 ${categoryColorClass}`}>
                        {(() => {
                          const IconComp = (LucideIcons as any)[categoryIcon] || HelpCircle;
                          return <IconComp size={20} />;
                        })()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{topCategoryInfo.name}</h4>
                        <p className="text-xs font-extrabold text-slate-900 mt-0.5">{formatIDR(topCategoryInfo.value)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(topCategoryPercentage, 100)}%` }}
                          className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] font-medium text-gray-500 leading-snug">
                        {i18n.language === 'en' ? (
                          <>
                            <span className="font-bold text-slate-750">{topCategoryInfo.name}</span> takes up{' '}
                            <span className="font-bold text-indigo-600">{topCategoryPercentage}%</span> of total expenses this month.
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-750">{topCategoryInfo.name}</span> mengambil{' '}
                            <span className="font-bold text-indigo-600">{topCategoryPercentage}%</span> dari total pengeluaran bulan ini.
                          </>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-2 space-y-2">
                    <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                      <Wallet size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-500">{t('dashboard.no_recent_transactions')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Toggleable Widget Section (Middle/Bottom) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {i18n.language === 'en' ? 'Financial Analysis' : 'Analisis Finansial'}
          </h3>
          <button 
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
          >
            <Settings2 size={14} /> {i18n.language === 'en' ? 'Customize Layout' : 'Atur Tampilan'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Widget: Cashflow Stats */}
          {visibleWidgets.cashflowStats && (
            <div className="lg:col-span-8 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                    {i18n.language === 'en' ? `Cash Flow Trend (${selectedYear})` : `Tren Arus Kas (${selectedYear})`}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {i18n.language === 'en' ? 'Your cash inflow and outflow movements this year' : 'Pergerakan uang masuk dan keluar Anda tahun ini'}
                  </p>
                </div>
                
                {/* Controls Row */}
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-xs text-gray-500 font-bold mr-3">{t('dashboard.income')}</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
                  <span className="text-xs text-gray-500 font-bold">{t('dashboard.expense')}</span>
                </div>
              </div>

              {/* Area Chart with custom sharp tension curve */}
              <div className="h-[280px] w-full mt-2">
                {transactions.filter(t => t.date && new Date(t.date).getFullYear() === selectedYear).length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-gray-100 border-dashed">
                    <LucideIcons.BarChart2 size={32} className="mb-3 opacity-40 text-indigo-400" />
                    <p className="text-xs font-bold text-gray-500">
                      {i18n.language === 'en' ? `No transactions in year ${selectedYear}` : `Belum ada transaksi di tahun ${selectedYear}`}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {i18n.language === 'en' ? 'Cash flow movement data will appear here' : 'Data pergerakan arus kas akan muncul di sini'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartIncomeColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="chartExpenseColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type={curveCardinal.tension(0.8)} dataKey="Pemasukan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#chartIncomeColor)" />
                    <Area type={curveCardinal.tension(0.8)} dataKey="Pengeluaran" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#chartExpenseColor)" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Widget: Expense Distribution */}
          {visibleWidgets.expenseDistribution && (
            <div className="lg:col-span-4 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {i18n.language === 'en' ? 'All Expenses' : 'Semua Pengeluaran'}
                </h3>
                <p className="text-xs text-gray-400">
                  {i18n.language === 'en' ? 'Based on categories this month' : 'Berdasarkan kategori bulan ini'}
                </p>
              </div>
              
              {/* Concentric Circle SVG Chart with viewBox scaling to prevent clipping */}
              {expenseCategoriesBreakdown.length === 0 ? (
                <div className="h-[280px] w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-gray-100 border-dashed mt-4">
                  <LucideIcons.PieChart size={32} className="mb-3 opacity-40 text-orange-400" />
                  <p className="text-xs font-bold text-gray-500">
                    {i18n.language === 'en' ? 'No expenses this month' : 'Belum ada pengeluaran bulan ini'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {i18n.language === 'en' ? 'Cash flow movement data will appear here' : 'Data pergerakan arus kas akan muncul di sini'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-[180px] w-full flex items-center justify-center relative my-2 overflow-hidden">
                    <svg className="w-40 h-40 transform -rotate-90 mx-auto" viewBox="0 0 160 160">
                      {expenseCategoriesBreakdown.map((item, idx) => {
                        const radius = 64 - idx * 13;
                        const strokeWidth = 8;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (Math.min(item.percentage, 100) / 100) * circumference;
                        return (
                          <g key={idx}>
                            <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
                            <circle cx="80" cy="80" r={radius} stroke={item.color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                          </g>
                        );
                      })}
                    </svg>
                    {/* Center Text dynamically bound to total of displayed categories */}
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                      <span className="text-sm font-black text-slate-900">
                        {formatIDR(expenseCategoriesBreakdown.reduce((sum, item) => sum + item.value, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="space-y-3 mt-2">
                    {expenseCategoriesBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-gray-700">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-gray-400 font-medium">{formatIDR(item.value)}</span>
                          <span className="font-extrabold text-slate-900 w-8 text-right">{Math.round(item.percentage)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Widget: Precious Metals Tracker */}
          {visibleWidgets.preciousMetals && (
            <GoldPriceTracker />
          )}

          {/* Widget: Recent Transactions */}
          {visibleWidgets.recentTransactions && (
            <div className="lg:col-span-6 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col min-h-[280px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center">
                      <Repeat size={16} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {i18n.language === 'en' ? 'Recent Activity' : 'Aktivitas Terkini'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {i18n.language === 'en' ? '5 latest recorded transactions' : '5 transaksi terakhir yang tercatat'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 flex-1">
                {topRecentTransactions.length > 0 ? (
                  topRecentTransactions.map((t) => {
                    const isIncome = t.type === 'pemasukan';
                    const isTransfer = t.type === 'transfer';
                    const iconConfig = getCategoryIconAndColor(t.category);
                    const Icon = iconConfig.Icon;
                    const colorClass = iconConfig.colorClass;
                    const amountColor = isTransfer ? "text-slate-800" : (isIncome ? "text-emerald-600" : "text-slate-900");
                    const prefix = isTransfer ? "" : (isIncome ? "+" : "-");
                    
                    const isSplit = t.description?.startsWith('Bagi Transaksi -');
                    const cleanName = isSplit ? t.category : (t.description || t.category);
                    
                    return (
                      <div key={t.id} className="flex items-center justify-between pb-3 pt-1 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{cleanName}</h4>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">{humanizeDate(t.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSplit && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Split</span>}
                          <span className={`text-sm font-black tabular-nums ${amountColor}`}>
                            {prefix}{formatIDR(t.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-2">
                      <Search size={16} />
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {i18n.language === 'en' ? 'No transactions yet' : 'Belum ada transaksi'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                <button 
                  onClick={() => setActiveTab('transactions')} 
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {i18n.language === 'en' ? 'View All' : 'Lihat Semua'} <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Widget: Pemantau Anggaran (Budget Monitor) */}
          {visibleWidgets.budgetMonitor && (
            <BudgetMonitor 
              globalDashboardDate={dashboardDate}
              categories={categories}
              setActiveTab={setActiveTab}
              periods={periods}
              budgets={budgets}
              transactions={transactions}
              globalBudgets={globalBudgets}
            />
          )}
        </div>
      </div>

      {/* ================= MODALS & POPUPS ================= */}
      {/* MODAL: CUSTOMIZE DASHBOARD */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {i18n.language === 'en' ? 'Customize Layout' : 'Atur Tampilan'}
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    {i18n.language === 'en' ? 'Choose widgets to display on your dashboard' : 'Pilih widget yang ingin ditampilkan'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCustomizeModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                <label key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <span className="text-sm font-bold text-gray-700">
                    {key === 'cashflowStats' && (i18n.language === 'en' ? 'Cashflow Stats' : 'Statistik Arus Kas')}
                    {key === 'expenseDistribution' && (i18n.language === 'en' ? 'Expense Distribution' : 'Distribusi Pengeluaran')}
                    {key === 'preciousMetals' && (i18n.language === 'en' ? 'Precious Metals & Calculator' : 'Pantauan Logam Mulia & Kalkulator')}
                    {key === 'recentTransactions' && (i18n.language === 'en' ? 'Recent Activity' : 'Aktivitas Terkini')}
                    {key === 'budgetMonitor' && (i18n.language === 'en' ? 'Budget Monitor' : 'Pemantau Anggaran')}
                  </span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowCustomizeModal(false)}
              className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              {i18n.language === 'en' ? 'Save Settings' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}


      {/* MODAL 1: RETIREMENT SAVINGS CALCULATOR */}
      {showRetirementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-950">
                    {i18n.language === 'en' ? 'Retirement Planner' : 'Kalkulator Rencana Pensiun'}
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    {i18n.language === 'en' ? 'Projections for your retirement fund growth' : 'Proyeksi pertumbuhan dana pensiun Anda'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRetirementModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4 my-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    {i18n.language === 'en' ? 'Your Current Age' : 'Usia Anda Sekarang'}
                  </label>
                  <input
                    type="number"
                    value={calcCurrentAge}
                    onChange={(e) => setCalcCurrentAge(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    {i18n.language === 'en' ? 'Target Retirement Age' : 'Target Usia Pensiun'}
                  </label>
                  <input
                    type="number"
                    value={calcRetireAge}
                    onChange={(e) => setCalcRetireAge(Math.max(calcCurrentAge + 1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  {i18n.language === 'en' ? 'Monthly Savings (IDR)' : 'Tabungan Bulanan (Rp)'}
                </label>
                <input
                  type="number"
                  value={calcMonthlySavings}
                  onChange={(e) => setCalcMonthlySavings(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  {i18n.language === 'en' ? 'Estimated Investment Yield (% per year)' : 'Estimasi Imbal Hasil Investasi (% per tahun)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={calcReturnRate}
                    onChange={(e) => setCalcReturnRate(parseInt(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {calcReturnRate}%
                  </span>
                </div>
              </div>

              <button
                onClick={calculateRetirementProjections}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/10 cursor-pointer"
              >
                {i18n.language === 'en' ? 'Calculate Financial Projections' : 'Hitung Proyeksi Finansial'}
              </button>
            </div>

            {/* Results output */}
            {calcResult && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                <div className="text-center pb-2 border-b border-emerald-100/50">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                    {i18n.language === 'en' ? 'Estimated Total Retirement Fund' : 'Estimasi Total Dana Hari Tua'}
                  </span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">
                    {formatIDR(calcResult.totalWealth)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">
                      {i18n.language === 'en' ? 'Total Principal Contributions' : 'Total Kontribusi Pokok'}
                    </span>
                    <span className="font-extrabold text-slate-800">{formatIDR(calcResult.totalPrincipal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">
                      {i18n.language === 'en' ? 'Accumulated Investment Yield' : 'Akumulasi Hasil Investasi'}
                    </span>
                    <span className="font-extrabold text-emerald-700">{formatIDR(calcResult.totalInterest)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: DOMPET / DIGITAL WALLET INFO */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-950">Trakr Digital Wallet</h4>
                  <p className="text-[10px] text-gray-400">
                    {i18n.language === 'en' ? 'Connect digital wallets and e-commerce' : 'Hubungkan dompet digital dan e-commerce'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                {i18n.language === 'en' 
                  ? 'In the future, Trakr will support automatic synchronization (auto-sync) with popular Indonesian e-wallets like GoPay, OVO, Dana, as well as leading Mobile Banking services.'
                  : 'Di masa depan, Trakr akan mendukung integrasi otomatis (auto-sync) dengan berbagai layanan e-wallet populer di Indonesia seperti GoPay, OVO, Dana, serta Mobile Banking terkemuka.'}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                  <span className="text-xs font-bold text-gray-700">Bank Transfer & Virtual Account</span>
                  <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {i18n.language === 'en' ? 'Available' : 'Tersedia'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 opacity-60">
                  <span className="text-xs font-bold text-gray-700">GoPay Auto-Sync</span>
                  <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {i18n.language === 'en' ? 'Coming Soon' : 'Segera Hadir'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 opacity-60">
                  <span className="text-xs font-bold text-gray-700">OVO / Dana Auto-Sync</span>
                  <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {i18n.language === 'en' ? 'Coming Soon' : 'Segera Hadir'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowWalletModal(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
              >
                {i18n.language === 'en' ? 'Close' : 'Tutup Informasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ANALYTICS INSIGHTS */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-950">
                    {i18n.language === 'en' ? 'Smart Financial Insights' : 'Analisis Keuangan Pintar'}
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    {i18n.language === 'en' ? 'Tactical recommendations to save your money' : 'Rekomendasi taktis untuk menghemat dana Anda'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnalyticsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6 text-xs text-gray-600 leading-relaxed">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-indigo-900 block">
                    {i18n.language === 'en' ? 'Your Expense Ratio' : 'Rasio Pengeluaran Anda'}
                  </span>
                  <p className="text-indigo-950">
                    {i18n.language === 'en' 
                      ? `Your monthly expense ratio is in a healthy range (${Math.round((finalDisplayExpense / finalDisplayIncome) * 100)}% of total income). Recommendation: Allocate at least 20% of remaining funds into safe investment portfolios.`
                      : `Rasio pengeluaran bulanan Anda berada di rentang yang sangat sehat (${Math.round((finalDisplayExpense / finalDisplayIncome) * 100)}% dari total pendapatan). Rekomendasi: Alokasikan minimal 20% sisa dana ke portofolio investasi aman.`}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="font-bold text-gray-800 block">
                    {i18n.language === 'en' ? '💡 Budget Efficiency Tips' : '💡 Tips Efisiensi Anggaran'}
                  </span>
                  <p className="text-gray-400 mt-0.5">
                    {i18n.language === 'en'
                      ? 'Try to reduce unused subscription fees to accelerate your financial freedom target.'
                      : 'Cobalah untuk menekan biaya tagihan langganan tak terpakai untuk mempercepat target kemandirian finansial Anda.'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="font-bold text-gray-800 block">
                    {i18n.language === 'en' ? '🎯 50/30/20 Rule' : '🎯 Aturan 50/30/20'}
                  </span>
                  <p className="text-gray-400 mt-0.5">
                    {i18n.language === 'en'
                      ? 'Maintain structure: 50% for needs, 30% for wants, and 20% for retirement savings or investments.'
                      : 'Pertahankan struktur: 50% untuk kebutuhan pokok, 30% untuk gaya hidup (keinginan), dan 20% untuk tabungan/investasi hari tua.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
              >
                {i18n.language === 'en' ? 'Done' : 'Selesai Membaca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KONSULTASI */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-950">
                    {i18n.language === 'en' ? 'Trakr Financial Assistant' : 'Asisten Finansial Trakr'}
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    {i18n.language === 'en' ? 'Consult your financial strategy with Trakr Assistant' : 'Konsultasikan strategi keuangan dengan Asisten Trakr'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowChatModal(false);
                  setChatFeedback('');
                  setChatInput('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6 text-xs text-gray-600 leading-relaxed">
              <div className="bg-indigo-50 text-indigo-950 p-4 rounded-2xl">
                {i18n.language === 'en' ? (
                  <>
                    <strong>Hello, {displayUserName}!</strong> I am the Trakr Assistant. Based on your spending patterns this month, here is some tactical advice:
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Maintain your low daily food consumption costs.</li>
                      <li>Monitor weekend expenses on Entertainment.</li>
                      <li>Perform automatic mutual fund investment top-ups.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong>Halo, {displayUserName}!</strong> Saya adalah Asisten Trakr. Berdasarkan pola pengeluaran Anda bulan ini, berikut adalah anjuran taktis:
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Pertahankan tingkat konsumsi makanan harian Anda yang hemat.</li>
                      <li>Amati pengeluaran akhir pekan pada kategori Hiburan.</li>
                      <li>Lakukan top-up investasi berjangka reksadana otomatis.</li>
                    </ul>
                  </>
                )}
              </div>

              {chatFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl font-bold text-center">
                  {chatFeedback}
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                setChatFeedback(i18n.language === 'en' ? 'Trakr Assistant will reply shortly!' : 'Asisten Trakr akan segera menjawab!');
                setChatInput('');
              }} className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={i18n.language === 'en' ? "Ask anything about money-saving tips..." : "Tanyakan sesuatu tentang tips menghemat uang..."}
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <button 
                  type="submit"
                  className="px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {i18n.language === 'en' ? 'Send' : 'Kirim'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowChatModal(false);
                  setChatFeedback('');
                  setChatInput('');
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {i18n.language === 'en' ? 'Close Consultation' : 'Tutup Konsultasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
