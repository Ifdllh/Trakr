import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { masterDataService, transactionService } from '@/services/dbServices';
import { 
  MasterAccount, MasterAsset, MasterTag, MasterContact,
  Transaction, BudgetAllocation, BudgetPeriod, GlobalBudget,
  Category, PREDEFINED_CATEGORIES
} from '@/types';
import { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/context/ToastContext';

export function useAppData(user: FirebaseUser | null, isGuest: boolean) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [globalBudgets, setGlobalBudgets] = useState<GlobalBudget[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [accounts, setAccounts] = useState<MasterAccount[]>([]);
  const [assets, setAssets] = useState<MasterAsset[]>([]);
  const [tags, setTags] = useState<MasterTag[]>([]);
  const [contacts, setContacts] = useState<MasterContact[]>([]);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);
  const [triggerAddMasterData] = useState(0);

  const mergedCategories = useMemo(() => {
    let base = JSON.parse(JSON.stringify(PREDEFINED_CATEGORIES)) as Category[];
    
    const softDeletedParentNames = new Set<string>();
    customCategories.forEach(customCat => {
      if (!customCat.parentCategory && customCat.isActive === false) {
        softDeletedParentNames.add((customCat.name || '').toLowerCase() + "||" + customCat.type);
      }
    });

    base = base.filter(c => !softDeletedParentNames.has((c.name || '').toLowerCase() + "||" + c.type));

    customCategories.forEach(customCat => {
      if (customCat.isActive === false) {
        if (customCat.parentCategory) {
          const parent = base.find(c => c.name === customCat.parentCategory && c.type === customCat.type);
          if (parent) {
            parent.subcategories = (parent.subcategories || []).filter(s => (s || '').toLowerCase() !== (customCat.name || '').toLowerCase());
          }
        }
        return;
      }

      if (customCat.parentCategory) {
        const parent = base.find(c => c.name === customCat.parentCategory && c.type === customCat.type);
        if (parent) {
          if (!(parent.subcategories || []).some(s => (s || '').toLowerCase() === (customCat.name || '').toLowerCase())) {
            parent.subcategories.push(customCat.name);
          }
        }
      } else {
        const inactiveSubs = (customCat.inactiveSubcategories || []).map((s: string) => (s || '').toLowerCase());
        const activeSubs = (customCat.subcategories || []).filter((s: string) => !inactiveSubs.includes((s || '').toLowerCase()));

        const existingIdx = base.findIndex(c => (c.name || '').toLowerCase() === (customCat.name || '').toLowerCase() && c.type === customCat.type);
        if (existingIdx !== -1) {
          base[existingIdx] = {
            ...base[existingIdx],
            id: customCat.id || customCat.name,
            iconName: customCat.iconName || base[existingIdx].iconName,
            colorClass: customCat.colorClass || base[existingIdx].colorClass,
            colorHex: customCat.colorHex || customCat.color_hex || base[existingIdx].colorHex,
            subcategories: activeSubs.length > 0 ? activeSubs : base[existingIdx].subcategories
          };
        } else {
          base.push({
            id: customCat.id || customCat.name,
            name: customCat.name,
            type: customCat.type,
            iconName: customCat.iconName || 'Folder',
            colorClass: customCat.colorClass || 'text-indigo-600 bg-indigo-50 border-indigo-200',
            colorHex: customCat.colorHex || customCat.color_hex,
            subcategories: activeSubs,
          });
        }
      }
    });

    return base;
  }, [customCategories]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const txRes = await transactionService.get();
      const periodsRes = await masterDataService.get('periods');
      const accountsRes = await masterDataService.get('accounts');
      const assetsRes = await masterDataService.get('assets');
      const tagsRes = await masterDataService.get('tags');
      const contactsRes = await masterDataService.get('contacts');
      const customCatRes = await masterDataService.get('customCategories');
      const budgetsRes = await masterDataService.get('budgets');
      const globalBudgetsRes = await masterDataService.get('globalBudgets');

      setTransactions((Array.isArray(txRes) ? txRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random()),
        date: d.date || d.createdAt,
        accountId: d.accountId?.toString(),
        assetId: d.assetId?.toString(),
        tagId: d.tagId?.toString(),
        contactId: d.contactId?.toString(),
        periodId: d.periodId?.toString()
      })));
      setPeriods((Array.isArray(periodsRes) ? periodsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setAccounts((Array.isArray(accountsRes) ? accountsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setAssets((Array.isArray(assetsRes) ? assetsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setTags((Array.isArray(tagsRes) ? tagsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setContacts((Array.isArray(contactsRes) ? contactsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setCustomCategories((Array.isArray(customCatRes) ? customCatRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random())
      })));
      setBudgets((Array.isArray(budgetsRes) ? budgetsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random()),
        periodId: d.periodId?.toString(),
        globalBudgetId: d.globalBudgetId?.toString()
      })));
      setGlobalBudgets((Array.isArray(globalBudgetsRes) ? globalBudgetsRes : []).map((d: any) => ({
        ...d,
        id: d.id ? d.id.toString() : String(Math.random()),
        periodId: d.periodId?.toString(),
        totalTargetAmount: Number(d.totalTargetAmount)
      })));
      setLoadingData(false);
    } catch (err: any) {
      console.error('refreshData error:', err);
      showToast(err?.message || 'Gagal menyinkronkan data dari server', 'error');
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setMonthlyBudget(0);
      return;
    }
    setLoadingData(true);
    refreshData();
  }, [user, refreshData]);

  const handleUpdateBudget = async (budget: number) => {
    if (!user) return;
    try {
      setMonthlyBudget(budget);
    } catch (error) {

      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
    }
  };

  const handleSaveTransaction = async (transactionData: any, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      if (id) {
        await transactionService.save(transactionData, id);
      } else {
        await transactionService.save(transactionData);
      }
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {

      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      return;
    }
    try {
      await transactionService.delete(id);
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {

      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
    }
  };

  const handleSaveMasterData = async (collectionName: string, data: any, id?: string): Promise<string | void> => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      let resultId = id;
      if (id) {
        await masterDataService.save(collectionName, data, id);
      } else {
        const res = await masterDataService.save(collectionName, data);
        resultId = res.id;
      }
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      return resultId;
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
      throw error;
    }
  };

  const handleDeleteMasterData = async (collectionName: string, id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      await masterDataService.delete(collectionName, id);
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
      throw error;
    }
  };

  const handleSavePeriod = async (name: string, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      const data = { name, startDate: new Date().toISOString(), endDate: new Date().toISOString() };
      if (id) {
        await masterDataService.save('periods', data, id);
      } else {
        await masterDataService.save('periods', data);
      }
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
      throw error;
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      await masterDataService.delete('periods', id);
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
    }
  };

  const handleSaveBudgetAllocation = async (allocation: any, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      if (id) {
        await masterDataService.save('budgets', allocation, id);
      } else {
        await masterDataService.save('budgets', allocation);
      }
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
      throw error;
    }
  };

  const handleSaveGlobalBudget = async (globalBudget: any, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    try {
      if (id) {
        await masterDataService.save('globalBudgets', globalBudget, id);
      } else {
        await masterDataService.save('globalBudgets', globalBudget);
      }
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
      throw error;
    }
  };

  const handleDeleteBudgetAllocation = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      return;
    }
    try {
      await masterDataService.delete('budgets', id);
      await refreshData();
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
      showToast(msg, 'error');
    }
  };

  return {
    transactions,
    budgets,
    globalBudgets,
    periods,
    accounts,
    assets,
    tags,
    contacts,
    customCategories,
    mergedCategories,
    monthlyBudget,
    loadingData,
    triggerAddMasterData,
    refreshData,
    handleUpdateBudget,
    handleSaveTransaction,
    handleDeleteTransaction,
    handleSaveMasterData,
    handleDeleteMasterData,
    handleSavePeriod,
    handleDeletePeriod,
    handleSaveBudgetAllocation,
    handleSaveGlobalBudget,
    handleDeleteBudgetAllocation
  };
}
