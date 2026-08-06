import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SavingsGoal, Account } from '@/types';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine, Calendar } from 'lucide-react';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: 'topup' | 'withdraw', amount: number, accountId: string, note: string, date?: string) => Promise<void>;
  goal: SavingsGoal | null;
  isMutating?: boolean;
  accounts: Account[];
}

const formatIDR = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num || 0);
};

export function TopupModal({ isOpen, onClose, onSave, goal, isMutating, accounts }: TopupModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<'topup' | 'withdraw'>('topup');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts?.[0]?.id || '');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (accounts && accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, accounts]);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedAccountBalance = selectedAccount?.balance ?? 0;
  const numAmount = Number(amount.replace(/\D/g, '')) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmount('');
      return;
    }
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setAmount(formatted);
  };

  const isTopupOverdraft = type === 'topup' && numAmount > selectedAccountBalance;
  const isWithdrawOverdraft = type === 'withdraw' && goal ? numAmount > goal.currentAmount : false;
  const hasAmountError = numAmount > 0 && (isTopupOverdraft || isWithdrawOverdraft);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutating || !goal || !accountId || hasAmountError) return;

    await onSave(type, numAmount, accountId, note, date);
    setAmount('');
    setNote('');
    onClose();
  };

  if (!goal) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} containerClassName="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
          {goal.title}
        </h2>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setType('topup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'topup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownToLine size={16} />
            {t('savings.topup_btn', 'Add Funds')}
          </button>
          <button
            type="button"
            onClick={() => setType('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'withdraw' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpFromLine size={16} />
            {t('savings.withdraw_btn', 'Withdraw')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.amount', 'Amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amount}
                onChange={handleAmountChange}
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 transition-all tabular-nums ${
                  hasAmountError
                    ? 'border-red-500 text-red-900 focus:ring-red-500/20 focus:border-red-500'
                    : type === 'topup' 
                    ? 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500' 
                    : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
                placeholder="0"
              />
            </div>
            {isTopupOverdraft && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {t('savings.insufficient_account_funds', 'Insufficient funds in selected account.')} ({t('savings.available', 'Saldo tersedia:')} {formatIDR(selectedAccountBalance)})
              </p>
            )}
            {isWithdrawOverdraft && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {t('savings.insufficient_savings_funds', 'Amount exceeds savings goal balance.')} ({t('savings.max_available', 'Max available:')} {formatIDR(goal.currentAmount)})
              </p>
            )}
            {!hasAmountError && type === 'withdraw' && (
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                {t('savings.max_withdraw', 'Max available:')} {formatIDR(goal.currentAmount)}
              </p>
            )}
            {!hasAmountError && type === 'topup' && selectedAccount && (
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                {t('savings.available', 'Saldo tersedia:')} {formatIDR(selectedAccountBalance)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.account', 'Account')}
            </label>
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="" disabled>{t('savings.select_account', 'Select Account')}</option>
              {accounts.map(acc => {
                const name = acc.accountName || (acc as any).name || (acc as any).bankName || 'Rekening';
                const accNum = acc.accountNumber && acc.accountNumber.trim().length > 0
                  ? `****${acc.accountNumber.trim().slice(-4)}`
                  : null;
                const balanceStr = formatIDR(acc.balance || 0);

                const label = accNum
                  ? `${name} - ${accNum} (${balanceStr})`
                  : acc.accountType
                  ? `${name} - ${acc.accountType} (${balanceStr})`
                  : `${name} (${balanceStr})`;

                return (
                  <option key={acc.id} value={acc.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              <Calendar size={13} className="text-slate-400" />
              {t('savings.transaction_date', 'Transaction Date')}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.note_optional', 'Note (Optional)')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              placeholder={t('savings.note_placeholder', 'e.g. Bonus top-up')}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              {t('savings.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isMutating || !amount || numAmount <= 0 || hasAmountError || !accountId}
              className={`flex-1 px-4 py-3 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ${
                type === 'topup' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isMutating ? t('savings.processing', 'Processing...') : type === 'topup' ? t('savings.confirm_topup', 'Confirm Top-up') : t('savings.confirm_withdraw', 'Confirm Withdraw')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
