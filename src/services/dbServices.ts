import { api } from '@/lib/api';

export const masterDataService = {
  async get(collectionName: string) {
    const response = await api.get(`/masterdata/${collectionName}`);
    return response.data;
  },
  
  async save(collectionName: string, data: any, id?: string) {
    if (id) {
      const response = await api.put(`/masterdata/${collectionName}/${id}`, data);
      return response.data;
    } else {
      const response = await api.post(`/masterdata/${collectionName}`, data);
      return response.data;
    }
  },
  
  async delete(collectionName: string, id: string) {
    const response = await api.delete(`/masterdata/${collectionName}/${id}`);
    return response.data;
  }
};

export const transactionService = {
  async get(filters?: any) {
    const response = await api.get('/transactions', { params: filters });
    return response.data;
  },
  
  async save(data: any, id?: string) {
    if (id) {
      const response = await api.put(`/transactions/${id}`, data);
      return response.data;
    } else {
      const response = await api.post('/transactions', data);
      return response.data;
    }
  },
  
  async delete(id: string) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  }
};
