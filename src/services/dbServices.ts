import { api } from '@/lib/api';
import { collection, query, where, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { getActiveDb } from '@/lib/firebase';

export function subscribeToCollection(
  userId: string,
  collectionName: string,
  onDataChange: (data: any[]) => void,
  queryConstraints: QueryConstraint[] = []
) {
  const db = getActiveDb();
  if (!db) {
    console.error('Firestore db is undefined, preventing asyncQueue error.');
    return () => {};
  }
  const colRef = collection(db, 'users', userId, collectionName);
  
  let q = query(colRef, ...queryConstraints);

  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      onDataChange(data);
    },
    (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
    }
  );

  return unsubscribe;
}

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
