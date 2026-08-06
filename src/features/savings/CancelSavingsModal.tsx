import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SavingsGoal, Account } from '@/types';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Wallet } from 'lucide-react';

interface CancelSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  accounts: Account[];
  onConfirmCancel: (goal: SavingsGoal, accountId: string) => Promise<void>;
  isMutating?: boolean;
}

const formatIDR = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num || 0);
};

export function CancelSavingsModal({
  isOpen,
  onClose,
  goal,
  accounts,
  onConfirmCancel,
  isMutating
}: CancelSavingsModalProps) {
  const { t } = useTranslation();
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, isOpen]);

  if (!goal) return null;

  const hasBalance = goal.currentAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutating) return;
    await onConfirmCancel(goal, hasBalance ? selectedAccountId : '');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} containerClassName="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t('savings.cancel_modal_title', 'Cancel Savings Goal')}
            </h2>
            <p className="text-xs font-semibold text-slate-500">{goal.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl space-y-2 text-xs font-medium text-red-800">
            {hasBalance ? (
              t('savings.cancel_modal_warning', {
                amount: formatIDR(goal.currentAmount),
                defaultValue: `Are you sure? Remaining funds (${formatIDR(goal.currentAmount)}) will be returned to your main balance as Income.`
              })
            ) : (
              t('savings.cancel_modal_warning_empty', {
                defaultValue: `Are you sure you want to cancel this savings goal?`
              })
            )}
          </div>

          {hasBalance && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                <Wallet size={13} className="text-slate-500" />
                {t('savings.select_account_deposit', 'Select Account for Funds Deposit')}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                {accounts.map((acc: any) => {
                  const name = acc.accountName || acc.name || acc.bankName || 'Rekening';
                  const accNum = acc.accountNumber && acc.accountNumber.trim().length > 0
                    ? `****${acc.accountNumber.trim().slice(-4)}`
                    : null;
                  const label = accNum
                    ? `${name} - ${accNum}`
                    : acc.accountType
                    ? `${name} - ${acc.accountType}`
                    : name;

                  return (
                    <option key={acc.id} value={acc.id}>
                      {label} ({formatIDR(acc.balance || 0)})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isMutating}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {t('savings.cancel', 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isMutating || (hasBalance && !selectedAccountId)}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-sm shadow-red-600/20"
            >
              {isMutating
                ? '...'
                : hasBalance
                ? t('savings.btn_cancel_withdraw', 'Batalkan & Cairkan Dana')
                : t('savings.confirm_cancel', 'Ya, Batalkan Target')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
