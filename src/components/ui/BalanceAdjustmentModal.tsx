import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Wallet, ArrowUpRight, ArrowDownRight, SlidersHorizontal, 
  RotateCcw, Calendar, ChevronDown, Check
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { MasterAccount, Transaction, Category } from '@/types';
import { calculateAccountsWithBalance, upsertAdjustmentCategory } from '@/lib/accountUtils';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

interface BalanceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: MasterAccount[];
  transactions?: Transaction[];
  selectedAccountId?: string;
  categories?: Category[];
  customCategories?: any[];
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  onSaveTransaction: (transactionData: Partial<Transaction>) => Promise<void>;
}

export default function BalanceAdjustmentModal({
  isOpen,
  onClose,
  accounts = [],
  transactions = [],
  selectedAccountId,
  categories = [],
  customCategories = [],
  onSaveMasterData,
  onSaveTransaction
}: BalanceAdjustmentModalProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const isEn = i18n.language === 'en';

  const computedAccounts = useMemo(() => {
    return calculateAccountsWithBalance(accounts, transactions);
  }, [accounts, transactions]);

  const [selectedAccId, setSelectedAccId] = useState<string>('');
  const [actualBalanceRaw, setActualBalanceRaw] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize selected account & fields on open
  useEffect(() => {
    if (isOpen) {
      const activeAccs = computedAccounts.filter(a => a.isActive !== false);
      const defaultId = selectedAccountId || (activeAccs[0]?.id ? String(activeAccs[0].id) : '');
      setSelectedAccId(defaultId);
      setDate(new Date().toISOString().split('T')[0]);
      setIsAccountDropdownOpen(false);
    }
  }, [isOpen, selectedAccountId, computedAccounts]);

  const currentAccount = useMemo(() => {
    return computedAccounts.find(a => String(a.id) === String(selectedAccId));
  }, [computedAccounts, selectedAccId]);

  const currentBalance = currentAccount?.currentBalance ?? currentAccount?.balance ?? 0;

  // Initialize actual balance raw string when account changes
  useEffect(() => {
    if (currentAccount && isOpen) {
      const roundedBal = Math.round(currentBalance);
      setActualBalanceRaw(roundedBal.toString());
      setNote(t('balance_adjustment.auto_note', { account: currentAccount.accountName }));
    }
  }, [currentAccount, currentBalance, isOpen, t]);

  // Click outside to close account selector dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountDropdownOpen]);

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const actualBalanceNum = parseFloat(actualBalanceRaw) || 0;
  const difference = actualBalanceNum - currentBalance;
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;
  const isZero = difference === 0;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat(isEn ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumberDisplay = (digitsStr: string) => {
    if (!digitsStr) return '0';
    const num = parseFloat(digitsStr);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat(isEn ? 'en-US' : 'id-ID').format(num);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/[^0-9]/g, '');
    setActualBalanceRaw(digitsOnly);
  };

  const handleQuickBump = (delta: number) => {
    const nextVal = Math.max(0, actualBalanceNum + delta);
    setActualBalanceRaw(Math.round(nextVal).toString());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleResetToCurrent = () => {
    setActualBalanceRaw(Math.round(currentBalance).toString());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccId) {
      showToast(t('balance_adjustment.toast_select_account_err', 'Pilih rekening terlebih dahulu'), 'error');
      return;
    }

    if (isZero) {
      showToast(t('balance_adjustment.toast_equal_err', 'Saldo riil sama dengan saldo aplikasi, tidak ada penyesuaian yang perlu disimpan'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const absAmount = Math.abs(difference);
      const type = isIncrease ? 'pemasukan' : 'pengeluaran';

      // Ensure Master Category & Subcategory exist and are saved in Master Data
      const { category, subcategory } = await upsertAdjustmentCategory({
        type,
        categories,
        customCategories,
        onSaveMasterData
      });

      const autoDesc = note.trim() || t('balance_adjustment.auto_note', { account: currentAccount?.accountName || 'rekening' });

      await onSaveTransaction({
        type,
        amount: absAmount,
        category,
        subcategory,
        date,
        description: autoDesc,
        accountId: selectedAccId,
        createdAt: new Date().toISOString()
      });

      showToast(t('balance_adjustment.toast_success', { account: currentAccount?.accountName || '', balance: formatCurrency(actualBalanceNum) }), 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error saving balance adjustment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const AccountIcon = (currentAccount?.icon && (LucideIcons as any)[currentAccount.icon])
    ? (LucideIcons as any)[currentAccount.icon]
    : Wallet;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
                <SlidersHorizontal size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                  {t('balance_adjustment.title', 'Account Balance Adjustment')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t('balance_adjustment.subtitle', 'Sync app balance with real statement')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Account Selector */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-0.5">
                <span>{t('balance_adjustment.select_account', 'Account')}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isEn ? 'Current in App:' : 'Saldo Aplikasi:'}{' '}
                  <strong className="text-slate-700 font-mono font-bold">
                    {formatCurrency(currentBalance)}
                  </strong>
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: currentAccount?.color || '#4f46e5' }}
                    >
                      <AccountIcon size={14} />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {currentAccount?.accountName || 'Select Account'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {currentAccount?.accountType} {currentAccount?.accountNumber ? `· ${currentAccount.accountNumber}` : ''}
                      </span>
                    </div>
                  </div>

                  <ChevronDown 
                    size={15} 
                    className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isAccountDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {isAccountDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200/90 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                    {accounts.filter(a => a.isActive !== false).map((acc) => {
                      const isSelected = String(acc.id) === String(selectedAccId);
                      const AccItemIcon = (acc.icon && (LucideIcons as any)[acc.icon])
                        ? (LucideIcons as any)[acc.icon]
                        : Wallet;
                      const bal = acc.currentBalance ?? acc.balance ?? 0;

                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccId(acc.id);
                            setIsAccountDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-xs"
                              style={{ backgroundColor: acc.color || '#4f46e5' }}
                            >
                              <AccItemIcon size={13} />
                            </div>
                            <div className="truncate">
                              <span className={`text-xs font-bold block truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {acc.accountName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {acc.accountType} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-xs font-mono font-medium text-slate-600">
                              {formatCurrency(bal)}
                            </span>
                            {isSelected && (
                              <Check size={14} className="text-indigo-600 stroke-[3]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Hero Real Balance Input Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-0.5">
                <span>{isEn ? 'Target Real Balance' : 'Target Saldo Riil di Rekening'}</span>
                {!isZero && (
                  <button
                    type="button"
                    onClick={handleResetToCurrent}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Large Input with Rp Symbol */}
              <div className="relative flex items-center bg-slate-50/80 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-2xl px-4 py-3 transition-all">
                <span className="text-base font-extrabold text-slate-400 mr-2 select-none">
                  Rp
                </span>
                <input
                  id="real-balance-input"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={actualBalanceRaw ? formatNumberDisplay(actualBalanceRaw) : ''}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none tabular-nums tracking-tight"
                  required
                />
              </div>

              {/* Inline Difference Badge (No 'App balance matches' label) */}
              <div className="flex items-center justify-between px-1 pt-0.5 min-h-[22px]">
                {isDecrease && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 tabular-nums">
                    <ArrowDownRight size={13} strokeWidth={2.5} />
                    <span>{isEn ? 'Adjustment:' : 'Koreksi:'} -{formatCurrency(Math.abs(difference))}</span>
                    <span className="text-[10px] font-normal text-rose-500/80">({isEn ? 'Expense' : 'Pengeluaran'})</span>
                  </span>
                )}
                {isIncrease && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 tabular-nums">
                    <ArrowUpRight size={13} strokeWidth={2.5} />
                    <span>{isEn ? 'Adjustment:' : 'Koreksi:'} +{formatCurrency(difference)}</span>
                    <span className="text-[10px] font-normal text-emerald-600/80">({isEn ? 'Income' : 'Pemasukan'})</span>
                  </span>
                )}
                {isZero && (
                  <span className="text-[11px] font-medium text-slate-400">
                    {isEn ? 'No change to balance' : 'Tidak ada perubahan saldo'}
                  </span>
                )}

                {/* Quick Increment Helpers */}
                <div className="flex items-center gap-1 ml-auto">
                  {[
                    { label: '+50k', val: 50000 },
                    { label: '+100k', val: 100000 },
                    { label: '+500k', val: 500000 },
                    { label: '+1M', val: 1000000 }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuickBump(item.val)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-md text-[10px] font-bold transition-colors cursor-pointer active:scale-95"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date & Note Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">
                  {t('balance_adjustment.date_label', 'Date')}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">
                  {t('balance_adjustment.note_label', 'Note')}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('balance_adjustment.note_placeholder', 'Note...')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t('balance_adjustment.btn_cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isZero}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span>{t('balance_adjustment.saving', 'Saving...')}</span>
                ) : (
                  <span>{t('balance_adjustment.btn_save', 'Save Adjustment')}</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
