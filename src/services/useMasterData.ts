import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useGetMasterData = (collectionName: string) => {
  return useQuery({
    queryKey: ['masterData', collectionName],
    queryFn: async () => {
      const { data } = await api.get(`/master/${collectionName}`);
      return data;
    },
  });
};

export const useSaveMasterData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionName, data, id }: { collectionName: string, data: any, id?: string }) => {
      if (id) {
        return await api.put(`/master/${collectionName}/${id}`, data);
      } else {
        return await api.post(`/master/${collectionName}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteMasterData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionName, id }: { collectionName: string, id: string }) => {
      return await api.delete(`/master/${collectionName}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};
