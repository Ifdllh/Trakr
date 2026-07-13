import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterDataService, transactionService } from '@/services/dbServices';

export const useGetAggregatedBudgets = (periodId: string) => {
  return useQuery({
    queryKey: ['budgets', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const budgets = await masterDataService.get('budgets');
      return budgets.filter((b: any) => b.periodId === periodId);
    },
    enabled: !!periodId
  });
};

export const useDeleteCategoryBudget = (selectedPeriod: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await masterDataService.delete('budgets', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', selectedPeriod] });
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
    }
  });
};

export const useGetBudgetTransactions = (categoryId: string, periodId: string) => {
  return useQuery({
    queryKey: ['budgetTransactions', categoryId, periodId],
    queryFn: async () => {
      if (!categoryId || !periodId) return [];
      const txs = await transactionService.get();
      return txs.filter((t: any) => 
        t.periodId === periodId && 
        (t.category === categoryId || t.categoryId === categoryId)
      );
    },
    enabled: !!categoryId && !!periodId
  });
};

export const useGetBudgetStatus = (periodId: string) => {
  return useQuery({
    queryKey: ['budgetStatus', periodId],
    queryFn: async () => {
      if (!periodId) return { targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 };
      
      const budgets = await masterDataService.get('budgets');
      const periodBudgets = budgets.filter((b: any) => b.periodId === periodId);
      
      const globalBudgets = await masterDataService.get('globalBudgets');
      const periodGlobal = globalBudgets.find((b: any) => b.periodId === periodId);
      
      const txs = await transactionService.get();
      const periodTxs = txs.filter((t: any) => t.periodId === periodId && (t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran'));
      
      const targetGlobal = periodGlobal ? Number((periodGlobal as any).totalTargetAmount) : 0;
      const totalTeralokasi = periodBudgets.reduce((sum: number, b: any) => sum + Number(b.calculatedAmount || b.value || 0), 0);
      const realisasiAktual = periodTxs.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      return {
        targetGlobal,
        totalTeralokasi,
        realisasiAktual,
        sisaSaldo: targetGlobal - realisasiAktual
      };
    },
    enabled: !!periodId
  });
};

export const useSuggestBudgets = (month: number, year: number) => {
  return useQuery({
    queryKey: ['budgetSuggestions', month, year],
    queryFn: async () => {
      // Simplification: fetch all txs and aggregate
      const txs = await transactionService.get();
      const expTxs = txs.filter((t: any) => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
      
      const map: Record<string, number> = {};
      expTxs.forEach((tx: any) => {
         const cat = tx.category || 'Lainnya';
         map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
      });
      
      return Object.keys(map).map(k => ({
         category_id: k,
         name: k,
         suggested_amount: Math.round(map[k] / 3) // Assuming average over 3 months loosely
      }));
    },
    enabled: false
  });
};
