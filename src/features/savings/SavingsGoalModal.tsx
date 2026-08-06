import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SavingsGoal } from '@/types';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  goalToEdit?: SavingsGoal | null;
  isMutating?: boolean;
}

export function SavingsGoalModal({ isOpen, onClose, onSave, goalToEdit, isMutating }: SavingsGoalModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);

  const formatNumberWithDots = (val: string | number) => {
    if (!val && val !== 0) return '';
    const raw = String(val).replace(/\D/g, '');
    if (!raw) return '';
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setTargetAmount(formatNumberWithDots(goalToEdit.targetAmount));
      if (goalToEdit.deadlineDate) {
        setDeadlineDate(new Date(goalToEdit.deadlineDate));
      } else {
        setDeadlineDate(null);
      }
    } else {
      setTitle('');
      setTargetAmount('');
      setDeadlineDate(null);
    }
  }, [goalToEdit, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setTargetAmount('');
      return;
    }
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setTargetAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutating) return;

    const parsedAmount = Number(targetAmount.replace(/\D/g, '')) || 0;

    await onSave({
      title,
      targetAmount: parsedAmount,
      deadlineDate: deadlineDate ? deadlineDate.toISOString() : ''
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} containerClassName="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">
          {goalToEdit ? t('savings.edit_goal', 'Edit Savings Goal') : t('savings.create_goal', 'New Savings Goal')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.goal_title', 'Goal Title')}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              placeholder={t('savings.title_placeholder', 'e.g. New Macbook Pro')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.target_amount', 'Target Amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={targetAmount}
                onChange={handleAmountChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all tabular-nums"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {t('savings.deadline', 'Target Date')}
            </label>
            <div className="relative">
              <DatePicker
                selected={deadlineDate}
                onChange={(date) => setDeadlineDate(date)}
                dateFormat="dd/MM/yyyy"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholderText="dd/mm/yyyy"
                required
              />
            </div>
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
              disabled={isMutating || !title || !targetAmount || (Number(targetAmount.replace(/\D/g, '')) <= 0) || !deadlineDate}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isMutating ? t('savings.saving', 'Saving...') : t('savings.save', 'Save Goal')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
