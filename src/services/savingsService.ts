import { getActiveDb } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { SavingsGoal, SavingsTransaction } from '@/types';

export const savingsService = {
  /**
   * Fetch all savings goals for a specific user.
   * Normally handled via hooks (subscribeToCollection), but this provides a one-time fetch.
   */
  async fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const colRef = collection(db, 'users', userId, 'savingsGoals');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as SavingsGoal[];
  },

  /**
   * Create a new savings goal.
   */
  async createSavingsGoal(userId: string, data: Omit<SavingsGoal, 'id'>): Promise<string> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const colRef = collection(db, 'users', userId, 'savingsGoals');
    const newDocRef = doc(colRef);
    
    await setDoc(newDocRef, {
      ...data,
      id: newDocRef.id
    });
    
    return newDocRef.id;
  },

  /**
   * Update an existing savings goal.
   */
  async updateSavingsGoal(userId: string, goalId: string, data: Partial<SavingsGoal>): Promise<void> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await updateDoc(docRef, data);
  },

  /**
   * Soft delete a savings goal to preserve historical ledger integrity.
   */
  async deleteSavingsGoal(userId: string, goalId: string): Promise<void> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const goalRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await updateDoc(goalRef, {
      status: 'archived',
      isDeleted: true,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Cancel goal and soft-delete it while optionally withdrawing remaining funds back to main account balance.
   */
  async cancelAndWithdrawSavingsGoal(
    userId: string,
    goalId: string,
    goalTitle: string,
    currentAmount: number,
    accountId?: string,
    skipGlobalTx: boolean = false
  ): Promise<void> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const goalRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const globalTxColRef = collection(db, 'users', userId, 'transactions');

    if (currentAmount > 0 && accountId && !skipGlobalTx) {
      const dateNow = new Date().toISOString();
      const newGlobalTxRef = doc(globalTxColRef);
      const globalTxData = {
        type: 'pemasukan',
        amount: currentAmount,
        category: 'Pencairan Tabungan',
        accountId: accountId,
        date: dateNow,
        description: `Pencairan Tabungan (Pembatalan Target): ${goalTitle}`,
        createdAt: dateNow
      };
      await setDoc(newGlobalTxRef, globalTxData);
    }

    // 2. Soft delete the savings goal (set status to 'archived' & isDeleted to true)
    await updateDoc(goalRef, {
      status: 'archived',
      isDeleted: true,
      currentAmount: 0,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Add a savings transaction and update the parent goal's currentAmount.
   */
  async addSavingsTransaction(
    userId: string, 
    goalId: string, 
    goalTitle: string,
    type: 'topup' | 'withdraw', 
    amount: number, 
    accountId: string,
    note?: string,
    skipGlobalTx: boolean = false,
    categoryName?: string,
    subcategoryName?: string,
    date?: string
  ): Promise<string> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const goalRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const txColRef = collection(db, 'users', userId, 'savingsTransactions');
    const newTxRef = doc(txColRef);
    
    // Global transaction ref
    const globalTxColRef = collection(db, 'users', userId, 'transactions');
    const newGlobalTxRef = doc(globalTxColRef);

    const goalDoc = await getDoc(goalRef);
    if (!goalDoc.exists()) {
      throw new Error('Savings goal does not exist!');
    }

    const currentAmount = goalDoc.data()?.currentAmount || 0;
    const targetAmount = goalDoc.data()?.targetAmount || 0;
    const newAmount = type === 'topup' 
      ? currentAmount + amount 
      : Math.max(0, currentAmount - amount);

    const dateNow = new Date().toISOString();
    const txDate = date || dateNow.split('T')[0];

    const txData: Omit<SavingsTransaction, 'id'> = {
      goalId,
      type,
      amount,
      date: txDate,
      note: note || ''
    };

    // 1. Add savings transaction record
    await setDoc(newTxRef, {
      ...txData,
      id: newTxRef.id
    });

    // 2. Update goal's current amount
    await updateDoc(goalRef, { 
      currentAmount: newAmount,
      status: newAmount >= targetAmount && targetAmount > 0 ? 'completed' : 'active' 
    });

    // 3. Inject global transaction for double-entry bookkeeping if not skipped
    if (!skipGlobalTx) {
      const txType = type === 'topup' ? 'pengeluaran' : 'pemasukan';
      const defaultCategory = categoryName || 'Tabungan & Impian';
      const defaultSubcategory = subcategoryName || (type === 'topup' ? 'Alokasi Tabungan' : 'Pencairan Tabungan');
      const defaultDescription = note 
        ? note 
        : (type === 'topup' ? `Top-up Tabungan: ${goalTitle}` : `Penarikan Tabungan: ${goalTitle}`);

      const globalTxData = {
        type: txType,
        amount: amount,
        category: defaultCategory,
        subcategory: defaultSubcategory,
        accountId: String(accountId),
        savingsGoalId: String(goalId),
        date: txDate,
        description: defaultDescription,
        createdAt: dateNow
      };
      
      await setDoc(newGlobalTxRef, globalTxData);
    }

    return newTxRef.id;

    return newTxRef.id;
  },

  /**
   * Delete a transaction with rollback on the linked savings goal.
   */
  async deleteTransactionWithRollback(userId: string, transactionId: string): Promise<void> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const txDocRef = doc(db, 'users', userId, 'transactions', transactionId);

    try {
      const txSnap = await getDoc(txDocRef);
      if (!txSnap.exists()) {
        await deleteDoc(txDocRef);
        return;
      }

      const txData = txSnap.data();
      const savingsGoalId = txData?.savingsGoalId;
      const amount = Number(txData?.amount) || 0;
      const type = (txData?.type || '').toLowerCase();

      // Step 1: Revert Savings Goal Balance if linked
      if (savingsGoalId && amount > 0) {
        try {
          const goalDocRef = doc(db, 'users', userId, 'savingsGoals', String(savingsGoalId));
          const goalSnap = await getDoc(goalDocRef);

          if (goalSnap.exists()) {
            const goalData = goalSnap.data();
            const currentAmount = Number(goalData?.currentAmount) || 0;
            const targetAmount = Number(goalData?.targetAmount) || 0;
            let newAmount = currentAmount;

            if (type === 'pengeluaran' || type === 'expense') {
              // Deleting an Expense (Top-up): Subtract transaction amount from goal's currentAmount
              newAmount = Math.max(0, currentAmount - amount);
            } else if (type === 'pemasukan' || type === 'income') {
              // Deleting an Income (Withdrawal): Add transaction amount back to goal's currentAmount
              newAmount = currentAmount + amount;
            }

            let status = goalData?.status || 'active';
            if (status !== 'archived' && status !== 'cancelled') {
              status = (targetAmount > 0 && newAmount >= targetAmount) ? 'completed' : 'active';
            }

            await updateDoc(goalDocRef, {
              currentAmount: newAmount,
              status,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (goalErr) {
          console.error('[deleteTransactionWithRollback] Error updating goal balance:', goalErr);
        }
      }

      // Step 2: Delete transaction record
      await deleteDoc(txDocRef);
    } catch (err) {
      console.error('[deleteTransactionWithRollback] Failed:', err);
      await deleteDoc(txDocRef).catch(() => {});
    }
  },

  /**
   * Update a transaction with Revert and Re-apply pattern on linked Savings Goals.
   */
  async updateTransactionWithRollback(userId: string, transactionId: string, payload: any): Promise<void> {
    const db = getActiveDb();
    if (!db) throw new Error('Firestore not initialized');

    const txDocRef = doc(db, 'users', userId, 'transactions', transactionId);

    try {
      const txSnap = await getDoc(txDocRef);
      if (!txSnap.exists()) {
        await setDoc(txDocRef, payload, { merge: true });
        return;
      }

      const oldTxData = txSnap.data();
      const newTxData = { ...oldTxData, ...payload };

      const oldGoalId = oldTxData?.savingsGoalId;
      const oldAmount = Number(oldTxData?.amount) || 0;
      const oldType = (oldTxData?.type || '').toLowerCase();

      const newGoalId = newTxData?.savingsGoalId;
      const newAmount = Number(newTxData?.amount) || 0;
      const newType = (newTxData?.type || '').toLowerCase();

      const oldGoalRef = oldGoalId ? doc(db, 'users', userId, 'savingsGoals', String(oldGoalId)) : null;
      const newGoalRef = newGoalId ? doc(db, 'users', userId, 'savingsGoals', String(newGoalId)) : null;

      const oldGoalSnap = oldGoalRef ? await getDoc(oldGoalRef) : null;
      const newGoalSnap = (newGoalRef && String(newGoalId) !== String(oldGoalId))
        ? await getDoc(newGoalRef)
        : (String(newGoalId) === String(oldGoalId) ? oldGoalSnap : null);

      const goalUpdates = new Map<string, { ref: any, currentAmount: number, targetAmount: number, status: string }>();

      if (oldGoalSnap && oldGoalSnap.exists() && oldAmount > 0) {
        const gData = oldGoalSnap.data();
        let curr = Number(gData?.currentAmount) || 0;
        if (oldType === 'pengeluaran' || oldType === 'expense') {
          curr = Math.max(0, curr - oldAmount);
        } else if (oldType === 'pemasukan' || oldType === 'income') {
          curr = curr + oldAmount;
        }
        goalUpdates.set(String(oldGoalId), {
          ref: oldGoalRef,
          currentAmount: curr,
          targetAmount: Number(gData?.targetAmount) || 0,
          status: gData?.status || 'active'
        });
      }

      if (newGoalSnap && newGoalSnap.exists() && newAmount > 0) {
        const gData = newGoalSnap.data();
        let curr = goalUpdates.has(String(newGoalId))
          ? goalUpdates.get(String(newGoalId))!.currentAmount
          : (Number(gData?.currentAmount) || 0);

        if (newType === 'pengeluaran' || newType === 'expense') {
          curr = curr + newAmount;
        } else if (newType === 'pemasukan' || newType === 'income') {
          curr = Math.max(0, curr - newAmount);
        }
        goalUpdates.set(String(newGoalId), {
          ref: newGoalRef,
          currentAmount: curr,
          targetAmount: Number(gData?.targetAmount) || 0,
          status: gData?.status || 'active'
        });
      }

      for (const [_, entry] of goalUpdates.entries()) {
        let status = entry.status;
        if (status !== 'archived' && status !== 'cancelled') {
          status = (entry.targetAmount > 0 && entry.currentAmount >= entry.targetAmount) ? 'completed' : 'active';
        }
        await updateDoc(entry.ref, {
          currentAmount: entry.currentAmount,
          status,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }

      payload.updatedAt = new Date().toISOString();
      if (oldTxData && oldTxData.createdAt) {
        payload.createdAt = oldTxData.createdAt;
      }

      await setDoc(txDocRef, payload, { merge: true });
    } catch (err) {
      console.error('[updateTransactionWithRollback] Failed:', err);
      await setDoc(txDocRef, payload, { merge: true });
    }
  }
};
