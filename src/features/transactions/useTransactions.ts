import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService, masterDataService } from '@/services/dbServices';
import { Transaction } from '@/types';

export const useGetTransactions = (filters?: any) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      
      let data = await transactionService.get();
      if (!Array.isArray(data)) data = [];

      if (filters) {
        if (filters.period_id) {
          data = data.filter((t: any) => t.periodId === filters.period_id);
        }
        if (filters.category) {
          data = data.filter((t: any) => t.category === filters.category);
        }
      }
      
      return data as Transaction[];
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: any | any[]) => {
      if (Array.isArray(transaction)) {
        const promises = transaction.map(t => transactionService.save(t));
        return await Promise.all(promises);
      }
      return await transactionService.save(transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeletePeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await masterDataService.delete('periods', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData', 'periods'] });
    },
  });
};
