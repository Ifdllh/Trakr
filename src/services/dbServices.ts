import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, getActiveAuth } from '@/lib/firebase';

const getUserId = () => {
  const user = getActiveAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
};

export const masterDataService = {
  async get(collectionName: string) {
    const userId = getUserId();
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async save(collectionName: string, data: any, id?: string) {
    const userId = getUserId();
    const payload = { ...data, userId, updatedAt: new Date().toISOString() };
    
    if (id) {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, payload);
      return { id, ...payload };
    } else {
      payload.createdAt = new Date().toISOString();
      const docRef = await addDoc(collection(db, collectionName), payload);
      return { id: docRef.id, ...payload };
    }
  },
  
  async delete(collectionName: string, id: string) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true };
  }
};

export const transactionService = {
  async get(filters?: any) {
    const userId = getUserId();
    let q = query(collection(db, 'transactions'), where('userId', '==', userId));
    // Could add more filters if needed by frontend
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async save(data: any, id?: string) {
    const userId = getUserId();
    const payload = { ...data, userId, updatedAt: new Date().toISOString() };
    
    if (id) {
      const docRef = doc(db, 'transactions', id);
      await updateDoc(docRef, payload);
      return { id, ...payload };
    } else {
      payload.createdAt = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'transactions'), payload);
      return { id: docRef.id, ...payload };
    }
  },
  
  async delete(id: string) {
    const docRef = doc(db, 'transactions', id);
    await deleteDoc(docRef);
    return { success: true };
  }
};
