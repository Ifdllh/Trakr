import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterDataService } from './dbServices';

export const useGetMasterData = (collectionName: string) => {
  return useQuery({
    queryKey: ['masterData', collectionName],
    queryFn: async () => {
      return await masterDataService.get(collectionName);
    },
  });
};

export const useSaveMasterData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionName, data, id }: { collectionName: string, data: any, id?: string }) => {
      return await masterDataService.save(collectionName, data, id);
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
      return await masterDataService.delete(collectionName, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};
