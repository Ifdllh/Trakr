import { useState, useEffect } from 'react';
import { SavingsGoal, SavingsTransaction } from '@/types';
import { subscribeToCollection } from '@/services/dbServices';
import { savingsService } from '@/services/savingsService';
import { User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/context/ToastContext';
import i18n from '@/i18n';

export function useSavingsData(user: FirebaseUser | null) {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [allGoals, setAllGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setAllGoals([]);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubGoals = subscribeToCollection(user.uid, 'savingsGoals', (data: any) => {
      const fetchedGoals = (data || []) as SavingsGoal[];
      setAllGoals(fetchedGoals);
      // Main UI only shows non-archived / non-deleted active and completed goals
      const activeGoals = fetchedGoals.filter(
        g => g.status !== 'archived' && g.status !== 'cancelled' && !g.isDeleted
      );
      setGoals(activeGoals);
      setIsLoading(false);
    });

    const unsubTransactions = subscribeToCollection(user.uid, 'savingsTransactions', (data: any) => {
      setTransactions(data as SavingsTransaction[]);
    });

    return () => {
      unsubGoals();
      unsubTransactions();
    };
  }, [user]);

  const createGoal = async (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'status' | 'currentAmount'>) => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      const newGoal: Omit<SavingsGoal, 'id'> = {
        ...data,
        currentAmount: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await savingsService.createSavingsGoal(user.uid, newGoal);
      showToast(i18n.t('savings.toast_add_success'), 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to create savings goal');
      showToast(err.message || i18n.t('common.toast_error'), 'error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const updateGoal = async (goalId: string, data: Partial<SavingsGoal>) => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      await savingsService.updateSavingsGoal(user.uid, goalId, data);
      showToast(i18n.t('toast.success.update') || 'Savings goal updated.', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to update savings goal');
      showToast(err.message || i18n.t('common.toast_error'), 'error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      await savingsService.deleteSavingsGoal(user.uid, goalId);
      showToast(i18n.t('savings.toast_delete_success'), 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to delete savings goal');
      showToast(err.message || i18n.t('common.toast_error'), 'error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const cancelAndWithdrawGoal = async (goalId: string, goalTitle: string, currentAmount: number, accountId?: string, skipGlobalTx: boolean = false) => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      await savingsService.cancelAndWithdrawSavingsGoal(user.uid, goalId, goalTitle, currentAmount, accountId, skipGlobalTx);
      showToast(i18n.t('savings.toast_delete_success'), 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel savings goal');
      showToast(err.message || i18n.t('common.toast_error'), 'error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const addTransaction = async (
    goalId: string, 
    goalTitle: string, 
    type: 'topup' | 'withdraw', 
    amount: number, 
    accountId: string, 
    note?: string,
    categoryName?: string,
    subcategoryName?: string,
    date?: string,
    skipGlobalTx: boolean = false
  ) => {
    if (!user) return;
    setIsMutating(true);
    setError(null);
    try {
      await savingsService.addSavingsTransaction(
        user.uid, 
        goalId, 
        goalTitle, 
        type, 
        amount, 
        accountId, 
        note, 
        skipGlobalTx, 
        categoryName, 
        subcategoryName,
        date
      );
      if (type === 'withdraw') {
        showToast(i18n.t('savings.toast_withdraw_success'), 'success');
      } else {
        showToast(i18n.t('savings.toast_topup_success'), 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add savings transaction');
      showToast(err.message || i18n.t('common.toast_error'), 'error');
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    goals,
    allGoals,
    transactions,
    isLoading,
    isMutating,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    cancelAndWithdrawGoal,
    addTransaction
  };
}
