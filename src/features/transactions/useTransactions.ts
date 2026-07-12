import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction } from '@/types';

export const useGetTransactions = (filters?: any) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { data } = await api.get<Transaction[]>('/transactions', {
        params: filters,
      });
      return data;
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'createdAt'> | Omit<Transaction, 'id' | 'createdAt'>[]) => {
      const { data } = await api.post('/transactions', transaction);
      return data;
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
      const { data } = await api.delete(`/periods/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData', 'periods'] });
    },
  });
};
