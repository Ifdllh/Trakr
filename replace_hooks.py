import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

pattern = re.compile(r'  const handleSavePeriod = async.*?const handleDeleteBudgetAllocation = async \(id: string\) => {.*?queryClient\.invalidateQueries\(\{ queryKey: \[\'budgets\'\] \}\);\n    \} catch \(error\) \{.*?\n    \}\n  \};', re.DOTALL)

replacement = """  const handleSavePeriod = async (name: string, id?: string) => {
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
          refreshData();
          queryClient.invalidateQueries({ queryKey: ['masterData'] });
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
        } catch (error: any) {
          setPeriods(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      try {
        const res = await masterDataService.save('periods', data);
        refreshData();
        setPeriods(prev => [...prev, { ...data, id: res.id } as any]);
        queryClient.invalidateQueries({ queryKey: ['masterData'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
        refreshData();
        queryClient.invalidateQueries({ queryKey: ['masterData'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
          refreshData();
          queryClient.invalidateQueries({ queryKey: ['masterData'] });
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
        } catch (error: any) {
          setBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      try {
        const res = await masterDataService.save('budgets', allocation);
        refreshData();
        setBudgets(prev => [...prev, { ...allocation, id: res.id }]);
        queryClient.invalidateQueries({ queryKey: ['masterData'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      } catch (error: any) {
        showToast(error.message || 'Terjadi kesalahan', 'error');
        throw error;
      }
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
          refreshData();
          queryClient.invalidateQueries({ queryKey: ['masterData'] });
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
        } catch (error: any) {
          setGlobalBudgets(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      try {
        const res = await masterDataService.save('globalBudgets', globalBudget);
        refreshData();
        setGlobalBudgets(prev => [...prev, { ...globalBudget, id: res.id }]);
        queryClient.invalidateQueries({ queryKey: ['masterData'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      } catch (error: any) {
        showToast(error.message || 'Terjadi kesalahan', 'error');
        throw error;
      }
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
        refreshData();
        queryClient.invalidateQueries({ queryKey: ['masterData'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      } catch (error: any) {
        setBudgets(rollbackData);
        showToast(error.message || 'Terjadi kesalahan', 'error');
      }
    })();
  };"""

content = re.sub(pattern, replacement, content)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
