import React, { useState, useMemo } from 'react';
import { useSavingsData } from '@/hooks/useSavingsData';
import { SavingsCard } from './SavingsCard';
import { SavingsGoalModal } from './SavingsGoalModal';
import { TopupModal } from './TopupModal';
import { CancelSavingsModal } from './CancelSavingsModal';
import { SavingsGoal, Account, Category } from '@/types';
import { User as FirebaseUser } from 'firebase/auth';
import { Target, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transactionService } from '@/services/dbServices';
import { upsertSavingsCategory } from '@/lib/accountUtils';

interface SavingsPageProps {
  user: FirebaseUser | null;
  accounts: Account[];
  categories?: Category[];
  customCategories?: any[];
  onSaveTransaction?: (transactionData: any, id?: string) => Promise<void>;
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
}

export function SavingsPage({ 
  user, 
  accounts, 
  categories, 
  customCategories,
  onSaveTransaction,
  onSaveMasterData 
}: SavingsPageProps) {
  const { t } = useTranslation();
  const { goals, isLoading, isMutating, createGoal, updateGoal, addTransaction, cancelAndWithdrawGoal } = useSavingsData(user);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const primarySavingsCategory = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    return categories.find(c => c.isSavings) || categories.find(c => (c.name || '').toLowerCase().includes('tabungan'));
  }, [categories]);

  const handleOpenCreateModal = () => {
    setSelectedGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEditModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenTopupModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsTopupModalOpen(true);
  };

  const handleOpenCancelModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setIsCancelModalOpen(true);
  };

  const handleSaveGoal = async (data: any) => {
    if (selectedGoal) {
      await updateGoal(selectedGoal.id, data);
    } else {
      await createGoal(data);
    }
  };

  const handleTopup = async (type: 'topup' | 'withdraw', amount: number, accountId: string, note: string, date?: string) => {
    if (selectedGoal) {
      const isWithdraw = type === 'withdraw';
      const txType: 'pemasukan' | 'pengeluaran' = isWithdraw ? 'pemasukan' : 'pengeluaran';
      const rawCategoryName = isWithdraw ? 'Pencairan Tabungan' : (primarySavingsCategory?.name || 'Tabungan & Impian');
      const rawSubcategoryName = isWithdraw ? 'Pencairan Tabungan' : 'Alokasi Tabungan';

      // 1. Upsert Category & Subcategory into Master Data to eliminate Ghost Categories
      const upserted = await upsertSavingsCategory({
        categoryName: rawCategoryName,
        subcategoryName: rawSubcategoryName,
        type: txType,
        categories: categories,
        customCategories: customCategories,
        onSaveMasterData: onSaveMasterData
      });

      const categoryName = upserted.category;
      const subcategoryName = upserted.subcategory;
      const txDate = date || new Date().toISOString().split('T')[0];
      const defaultDescription = note 
        ? note 
        : (type === 'topup' ? `Top-up Tabungan: ${selectedGoal.title}` : `Penarikan Tabungan: ${selectedGoal.title}`);

      // 2. Add savings transaction & update savings goal current amount
      await addTransaction(
        selectedGoal.id, 
        selectedGoal.title, 
        type, 
        amount, 
        accountId, 
        note, 
        categoryName, 
        subcategoryName,
        txDate,
        true // pass true for skipGlobalTx to prevent duplicate global record
      );

      // 3. Global Ledger Insertion & Instant State Synchronization
      const globalTxPayload = {
        type: txType,
        amount: amount,
        category: categoryName,
        subcategory: subcategoryName,
        accountId: String(accountId),
        savingsGoalId: String(selectedGoal.id),
        date: txDate,
        description: defaultDescription,
        createdAt: new Date().toISOString()
      };

      if (onSaveTransaction) {
        await onSaveTransaction(globalTxPayload);
      } else {
        await transactionService.save(globalTxPayload);
      }
    }
  };

  const handleAchieveGoal = async (goal: SavingsGoal) => {
    await updateGoal(goal.id, { status: 'completed' });
  };

  const handleConfirmCancelGoal = async (goal: SavingsGoal, accountId: string) => {
    const currentAmount = goal.currentAmount || 0;
    await cancelAndWithdrawGoal(goal.id, goal.title, currentAmount, accountId, true);

    if (currentAmount > 0 && accountId) {
      const rawCategoryName = 'Pencairan Tabungan';
      const rawSubcategoryName = 'Pencairan Tabungan';

      // Upsert Category & Subcategory into Master Data for withdrawal
      const upserted = await upsertSavingsCategory({
        categoryName: rawCategoryName,
        subcategoryName: rawSubcategoryName,
        type: 'pemasukan',
        categories: categories,
        customCategories: customCategories,
        onSaveMasterData: onSaveMasterData
      });

      const globalTxPayload = {
        type: 'pemasukan',
        amount: currentAmount,
        category: upserted.category,
        subcategory: upserted.subcategory,
        accountId: String(accountId),
        savingsGoalId: String(goal.id),
        date: new Date().toISOString().split('T')[0],
        description: `Pencairan Tabungan (Pembatalan Target): ${goal.title}`,
        createdAt: new Date().toISOString()
      };

      if (onSaveTransaction) {
        await onSaveTransaction(globalTxPayload);
      } else {
        await transactionService.save(globalTxPayload);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t('savings.title', 'Savings Goals')}</h2>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} />
          {t('savings.new_goal', 'New Goal')}
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{t('savings.empty_title', 'No savings goals yet')}</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {t('savings.empty_desc', 'Set a target for your dream vacation, a new gadget, or emergency fund.')}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t('savings.create_first', 'Create your first goal')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <SavingsCard
              key={goal.id}
              goal={goal}
              onEdit={handleOpenEditModal}
              onTopup={handleOpenTopupModal}
              onAchieve={handleAchieveGoal}
              onCancel={handleOpenCancelModal}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        goalToEdit={selectedGoal}
        isMutating={isMutating}
      />

      <TopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        onSave={handleTopup}
        goal={selectedGoal}
        isMutating={isMutating}
        accounts={accounts}
      />

      <CancelSavingsModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        goal={selectedGoal}
        accounts={accounts}
        onConfirmCancel={handleConfirmCancelGoal}
        isMutating={isMutating}
      />
    </div>
  );
}
