import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { X, Loader2, HelpCircle } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { BudgetAllocation, Category } from '@/types';

interface EditSingleBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: BudgetAllocation | null;
  category: Category | undefined;
  onSave: (id: string, amount: number) => Promise<void>;
}

export function EditSingleBudgetModal({ isOpen, onClose, budget, category, onSave }: EditSingleBudgetModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && budget) {
      const val = budget.type === 'percentage' ? 0 : (budget.value || 0);
      setAmount(val ? val.toString() : '');
    } else {
      setAmount('');
    }
  }, [isOpen, budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget) return;
    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount) || 0;
      await onSave(budget.id!, numericAmount);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {(() => { const IconComponent = (LucideIcons as any)[category?.iconName || 'HelpCircle'] || LucideIcons.HelpCircle; return <IconComponent size={20} />; })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">{category?.name || 'Category'}</h2>
                    <p className="text-xs font-bold text-slate-500">Edit Category Budget</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div data-lenis-prevent="true" className="p-6 overflow-y-auto custom-scrollbar">
                <form id="edit-single-budget-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Amount (Rp)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-sm">Rp</span>
                      </div>
                      <NumericFormat
                        value={amount}
                        onValueChange={(values) => setAmount(values.value)}
                        thousandSeparator="."
                        decimalSeparator=","
                        allowNegative={false}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-base text-slate-800"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 sticky bottom-0 shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-single-budget-form"
                  disabled={isSubmitting || !amount}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-200"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
