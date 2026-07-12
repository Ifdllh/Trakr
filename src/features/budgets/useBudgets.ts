import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useGetAggregatedBudgets = (periodId: string) => {
  return useQuery({
    queryKey: ['budgets', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data } = await api.get(`/budgets?period_id=${periodId}`);
      return data;
    },
    enabled: !!periodId
  });
};

export const useDeleteCategoryBudget = (selectedPeriod: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/master/budgets/${id}`);
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
      const { data } = await api.get(`/budgets/transactions?category_id=${categoryId}&period_id=${periodId}`);
      return data;
    },
    enabled: !!categoryId && !!periodId
  });
};

export const useGetBudgetStatus = (periodId: string) => {
  return useQuery({
    queryKey: ['budgetStatus', periodId],
    queryFn: async () => {
      if (!periodId) return { targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 };
      const { data } = await api.get(`/budgets/status?period_id=${periodId}`);
      return data;
    },
    enabled: !!periodId
  });
};

export const useSuggestBudgets = (month: number, year: number) => {
  return useQuery({
    queryKey: ['budgetSuggestions', month, year],
    queryFn: async () => {
      const response = await api.get(`/budgets/suggest?month=${month}&year=${year}`);
      return response.data?.success ? response.data.data : [];
    },
    enabled: false
  });
};


