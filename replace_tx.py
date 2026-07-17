import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

pattern = re.compile(r'  const handleSaveTransaction = async.*?const handleSaveMasterData = async', re.DOTALL)

replacement = """  const handleSaveTransaction = async (transactionData: any, id?: string) => {
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
          refreshData();
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        } catch (error: any) {
          setTransactions(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    } else {
      // Create can be an array if bulk create, wait let's check if it supports bulk.
      // In routes.ts, if Array.isArray(req.body) it bulk creates and returns an array.
      try {
        const res = await transactionService.save(transactionData);
        refreshData();
        if (Array.isArray(res)) {
          setTransactions(prev => [...prev, ...res]);
        } else {
          setTransactions(prev => [...prev, { ...transactionData, id: res.id } as any]);
        }
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } catch (error: any) {
        showToast(error.message || 'Terjadi kesalahan', 'error');
        throw error;
      }
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
        refreshData();
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } catch (error: any) {
        setTransactions(rollbackData);
        showToast(error.message || 'Terjadi kesalahan', 'error');
      }
    })();
  };

  const handleSaveMasterData = async"""

content = re.sub(pattern, replacement, content)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
