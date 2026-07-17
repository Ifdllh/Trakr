import { useState, useEffect, useMemo, useCallback } from 'react';
import { masterDataService, transactionService } from '@/services/dbServices';
import { 
  MasterAccount, MasterAsset, MasterTag, MasterContact,
  Transaction, BudgetAllocation, BudgetPeriod, GlobalBudget,
  Category, PREDEFINED_CATEGORIES
} from '@/types';
import { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/context/ToastContext';

export function useAppData(user: FirebaseUser | null, isGuest: boolean) {
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
      if (!err?.message?.includes('Quota') && !err?.message?.includes('429')) console.error('refreshData error:', err);
      if (err?.message?.includes('Quota') || err?.message?.includes('429')) {
        showToast('Batas penggunaan database harian tercapai. Silakan coba lagi besok.', 'error');
      } else {
        showToast(err?.message || 'Gagal menyinkronkan data dari server', 'error');
      }
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
    
    const rollbackData = transactions;
    if (id) {
      setTransactions(prev => prev.map(p => String(p.id) === id ? { ...p, ...transactionData } : p));
      (async () => {
        try {
          await transactionService.save(transactionData, id);
        } catch (error: any) {
          setTransactions(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      const isArray = Array.isArray(transactionData);
      const tempIds = isArray ? transactionData.map(() => Math.random().toString(36).substring(2, 15)) : [Math.random().toString(36).substring(2, 15)];
      
      const optimisticData = isArray 
        ? transactionData.map((t, i) => ({ ...t, id: tempIds[i] }))
        : [{ ...transactionData, id: tempIds[0] }];
        
      setTransactions(prev => [...prev, ...optimisticData]);

      (async () => {
        try {
          const res = await transactionService.save(transactionData);
          // Replace temp IDs with real IDs if needed, though invalidateQueries handles full refresh
          setTransactions(prev => {
            let next = [...prev];
            if (Array.isArray(res)) {
               res.forEach((r, i) => {
                 const idx = next.findIndex(t => String(t.id) === tempIds[i]);
                 if (idx !== -1) next[idx] = { ...next[idx], ...r };
               });
            } else {
               const idx = next.findIndex(t => String(t.id) === tempIds[0]);
               if (idx !== -1) next[idx] = { ...next[idx], ...res };
            }
            return next;
          });
        } catch (error: any) {
          setTransactions(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      return;
    }
    
    const rollbackData = transactions;
    setTransactions(prev => prev.filter(p => String(p.id) !== id));
    
    (async () => {
      try {
        await transactionService.delete(id);
      } catch (error: any) {
        setTransactions(rollbackData);
        showToast(error.message || 'Terjadi kesalahan', 'error');
      }
    })();
  };

  const handleSaveMasterData = async (collectionName: string, data: any, id?: string): Promise<string | void> => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    
    let resultId = id;
    let rollbackData: any = null;
    let setFunc: any = null;

    if (id) {
      // Optimistic Edit
      if (collectionName === 'accounts') { rollbackData = accounts; setFunc = setAccounts; setAccounts(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }
      else if (collectionName === 'assets') { rollbackData = assets; setFunc = setAssets; setAssets(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }
      else if (collectionName === 'tags') { rollbackData = tags; setFunc = setTags; setTags(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }
      else if (collectionName === 'contacts') { rollbackData = contacts; setFunc = setContacts; setContacts(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }
      else if (collectionName === 'periods') { rollbackData = periods; setFunc = setPeriods; setPeriods(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }
      else if (collectionName === 'customCategories') { rollbackData = customCategories; setFunc = setCustomCategories; setCustomCategories(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }

      (async () => {
        try {
          await masterDataService.save(collectionName, data, id);
        } catch (error: any) {
          if (setFunc && rollbackData) setFunc(rollbackData);
          const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
          showToast(msg, 'error');
        }
      })();
      return resultId;
    } else {
      // Optimistic Create - requires waiting for the ID from backend so we await it
      try {
        const res = await masterDataService.save(collectionName, data);
        resultId = res.id;
        // Push the new item optimistically after we got the ID
        const newItem = { ...data, id: resultId };
        if (collectionName === 'accounts') setAccounts(prev => [...prev, newItem]);
        else if (collectionName === 'assets') setAssets(prev => [...prev, newItem]);
        else if (collectionName === 'tags') setTags(prev => [...prev, newItem]);
        else if (collectionName === 'contacts') setContacts(prev => [...prev, newItem]);
        else if (collectionName === 'periods') setPeriods(prev => [...prev, newItem]);
        else if (collectionName === 'customCategories') setCustomCategories(prev => [...prev, newItem]);
        return resultId;
      } catch (error: any) {
        const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
        showToast(msg, 'error');
        throw error;
      }
    }
  };

  const handleDeleteMasterData = async (collectionName: string, id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    
    // Optimistic Delete
    let rollbackData: any = null;
    let setFunc: any = null;
    if (collectionName === 'accounts') { rollbackData = accounts; setFunc = setAccounts; setAccounts(prev => prev.filter(p => String(p.id) !== id)); }
    else if (collectionName === 'assets') { rollbackData = assets; setFunc = setAssets; setAssets(prev => prev.filter(p => String(p.id) !== id)); }
    else if (collectionName === 'tags') { rollbackData = tags; setFunc = setTags; setTags(prev => prev.filter(p => String(p.id) !== id)); }
    else if (collectionName === 'contacts') { rollbackData = contacts; setFunc = setContacts; setContacts(prev => prev.filter(p => String(p.id) !== id)); }
    else if (collectionName === 'periods') { rollbackData = periods; setFunc = setPeriods; setPeriods(prev => prev.filter(p => String(p.id) !== id)); }
    else if (collectionName === 'customCategories') { rollbackData = customCategories; setFunc = setCustomCategories; setCustomCategories(prev => prev.filter(p => String(p.id) !== id)); }

    // Send the API request asynchronously
    (async () => {
      try {
        await masterDataService.delete(collectionName, id);
      } catch (error: any) {
        if (setFunc && rollbackData) setFunc(rollbackData);
        const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';
        showToast(msg, 'error');
      }
    })();
  };

  const handleSavePeriod = async (name: string, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    const data = { name, startDate: new Date().toISOString(), endDate: new Date().toISOString() };
    const rollbackData = periods;
    
    if (id) {
      setPeriods(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p));
      (async () => {
        try {
          await masterDataService.save('periods', data, id);
        } catch (error: any) {
          setPeriods(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      try {
        const res = await masterDataService.save('periods', data);
        setPeriods(prev => [...prev, { ...data, id: res.id } as any]);
      } catch (error: any) {
        showToast(error.message || 'Terjadi kesalahan', 'error');
        throw error;
      }
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    
    const rollbackData = periods;
    setPeriods(prev => prev.filter(p => String(p.id) !== id));
    
    (async () => {
      try {
        await masterDataService.delete('periods', id);
      } catch (error: any) {
        setPeriods(rollbackData);
        showToast(error.message || 'Terjadi kesalahan', 'error');
      }
    })();
  };

  const handleSaveBudgetAllocation = async (allocation: any, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    const rollbackData = budgets;
    
    if (id) {
      setBudgets(prev => prev.map(p => String(p.id) === id ? { ...p, ...allocation } : p));
      (async () => {
        try {
          await masterDataService.save('budgets', allocation, id);
        } catch (error: any) {
          setBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      const isArray = Array.isArray(allocation);
      const tempIds = isArray ? allocation.map(() => Math.random().toString(36).substring(2, 15)) : [Math.random().toString(36).substring(2, 15)];
      
      const newAllocations = isArray 
        ? allocation.map((a: any, i: number) => ({ ...a, id: tempIds[i] }))
        : [{ ...allocation, id: tempIds[0] }];
        
      setBudgets(prev => [...prev, ...newAllocations]);
      
      (async () => {
        try {
          const res = await masterDataService.save('budgets', allocation);
          // If the backend returns generated IDs, we could map them here,
          // but optimistic updates rely on temp IDs being sufficient for immediate UI interactions
          if (isArray && Array.isArray(res)) {
            setBudgets(prev => {
              const prevCopy = [...prev];
              res.forEach((r: any, idx: number) => {
                const foundIdx = prevCopy.findIndex(p => p.id === tempIds[idx]);
                if (foundIdx !== -1) {
                  prevCopy[foundIdx] = { ...prevCopy[foundIdx], id: r.id };
                }
              });
              return prevCopy;
            });
          } else if (!isArray && res.id) {
            setBudgets(prev => prev.map(p => p.id === tempIds[0] ? { ...p, id: res.id } : p));
          }
        } catch (error: any) {
          setBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    }
  };

  const handleSaveGlobalBudget = async (globalBudget: any, id?: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      throw new Error('Fitur ini dinonaktifkan untuk akun Tamu');
    }
    const rollbackData = globalBudgets;
    
    if (id) {
      setGlobalBudgets(prev => prev.map(p => String(p.id) === id ? { ...p, ...globalBudget } : p));
      (async () => {
        try {
          await masterDataService.save('globalBudgets', globalBudget, id);
        } catch (error: any) {
          setGlobalBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      const tempId = Math.random().toString(36).substring(2, 15);
      setGlobalBudgets(prev => [...prev, { ...globalBudget, id: tempId }]);
      (async () => {
        try {
          const res = await masterDataService.save('globalBudgets', globalBudget);
          setGlobalBudgets(prev => prev.map(p => p.id === tempId ? { ...p, id: res.id } : p));
        } catch (error: any) {
          setGlobalBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    }
  };

  const handleDeleteBudgetAllocation = async (id: string) => {
    if (!user) return;
    if (isGuest) {
      showToast('Fitur ini dinonaktifkan untuk akun Tamu', 'error');
      return;
    }
    
    const rollbackData = budgets;
    setBudgets(prev => prev.filter(p => String(p.id) !== id));
    
    (async () => {
      try {
        await masterDataService.delete('budgets', id);
      } catch (error: any) {
        setBudgets(rollbackData);
        showToast(error.message || 'Terjadi kesalahan', 'error');
      }
    })();
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
