import React, { useState, useEffect } from 'react';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { useGetMasterData } from '@/services/useMasterData';
import { api } from '@/lib/api';
import { Category, Transaction, TransactionType, MasterAccount, MasterAsset, MasterContact, MasterTag } from '@/types';
import { PlusCircle, Calendar, FileText, DollarSign, X, Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import CreateMasterAccountModal from "@/components/ui/CreateMasterAccountModal";
import CreateMasterCategoryModal from "@/components/ui/CreateMasterCategoryModal";
import CreateSubCategoryModal from "@/components/ui/CreateSubCategoryModal";
import { z } from 'zod';

export const recurringTransactionSchema = z.object({
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  recurringEndDate: z.date().optional().nullable()
});

interface TransactionFormProps {
  categories: Category[];
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'> | Omit<Transaction, 'id' | 'createdAt'>[], id?: string) => Promise<void>;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  initialType?: TransactionType;
  accounts?: MasterAccount[];
  assets?: MasterAsset[];
  tags?: MasterTag[];
  contacts?: MasterContact[];
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
}

export default function TransactionForm({ 
  categories, onSave, onClose, transactionToEdit, initialType,
  accounts = [], assets = [], tags = [], contacts = [], onSaveMasterData
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialType || 'pengeluaran');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [tagId, setTagId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Recurring payment state
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);

  // New split state
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [splitRows, setSplitRows] = useState<{ category: string; subcategory: string; amount: string; description: string }[]>([
    { category: '', subcategory: '', amount: '', description: '' },
    { category: '', subcategory: '', amount: '', description: '' }
  ]);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getSubcategoriesForCategory = (catName: string) => {
    const catObj = categories.find(cat => cat.name === catName && cat.type === type);
    return catObj ? (catObj.subcategories || []) : [];
  };

  const totalGrandAmount = parseFloat(amount) || 0;
  const splitSum = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const isSplitBalanced = Math.abs(splitSum - totalGrandAmount) < 0.01;
  
  const { mutate: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { data: periods = [] } = useGetMasterData('periods');
  const [matchedPeriod, setMatchedPeriod] = useState<any>(null);

  useEffect(() => {
    if (!date || periods.length === 0) {
      setMatchedPeriod(null);
      return;
    }
    const txDate = new Date(date);
    const matched = periods.find((p: any) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return txDate >= start && txDate <= end;
    });
    setMatchedPeriod(matched || null);
  }, [date, periods]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Modal State
  const [quickAddType, setQuickAddType] = useState<string | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddSub, setQuickAddSub] = useState('');
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSubCategoryQuickAddClick = () => {
    if (!category) {
      setToastMessage('Silakan pilih Kategori Utama terlebih dahulu.');
      setError('Silakan pilih Kategori Utama terlebih dahulu.');
      return;
    }
    setError(null);
    setIsSubCategoryModalOpen(true);
  };

  // Filter categories based on transaction type
  const availableCategories = categories.filter(cat => cat.type === type);
  // Get current subcategories based on chosen category
  const selectedCategoryObj = categories.find(cat => cat.name === category && cat.type === type);
  const availableSubcategories = selectedCategoryObj ? selectedCategoryObj.subcategories : [];

  // Reset subcategory when category changes
  useEffect(() => {
    if (!transactionToEdit || (transactionToEdit && transactionToEdit.category !== category)) {
      setSubcategory('');
    }
  }, [category, transactionToEdit]);

  // Load data if editing
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setCategory(transactionToEdit.category);
      setSubcategory(transactionToEdit.subcategory);
      setDate(transactionToEdit.date);
      setDescription(transactionToEdit.description || '');
      setAccountId(transactionToEdit.accountId || '');
      setDestinationAccountId(transactionToEdit.destinationAccountId || '');
      setAssetId(transactionToEdit.assetId || '');
      setTagId(transactionToEdit.tagId || '');
      setContactId(transactionToEdit.contactId || '');
      setAttachmentUrl(transactionToEdit.attachmentUrl || '');
      
      const txAny = transactionToEdit as any;
      if (txAny.isRecurring !== undefined) {
        setIsRecurring(!!txAny.isRecurring);
        setRecurringFrequency(txAny.recurringFrequency || 'MONTHLY');
        setRecurringEndDate(txAny.recurringEndDate ? new Date(txAny.recurringEndDate) : null);
      } else if (txAny.recurringConfig) {
        setIsRecurring(!!txAny.recurringConfig.isRecurring);
        setRecurringFrequency(txAny.recurringConfig.recurringFrequency || 'MONTHLY');
        setRecurringEndDate(txAny.recurringConfig.recurringEndDate ? new Date(txAny.recurringConfig.recurringEndDate) : null);
      } else {
        setIsRecurring(false);
        setRecurringFrequency('MONTHLY');
        setRecurringEndDate(null);
      }
    } else {
      setIsRecurring(false);
      setRecurringFrequency('MONTHLY');
      setRecurringEndDate(null);
      if (initialType) {
        setType(initialType);
      }
    }
  }, [transactionToEdit, initialType]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('receipt', file);
    
    try {
      const response = await api.post('/transactions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = response.data;
      if (data && data.secureUrl) {
        setAttachmentUrl(data.secureUrl);
        setToastMessage('Struk berhasil diunggah!');
      } else {
        throw new Error('Url aman tidak ditemukan dalam respon.');
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Gagal mengunggah struk.';
      setToastMessage(`Gagal mengunggah struk: ${errorMessage}`);
      setError(`Gagal mengunggah struk: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Masukkan jumlah uang yang valid dan lebih dari 0.');
      return;
    }
    
    if (!accountId) {
      setError('Pilih sumber dana (Rekening) terlebih dahulu.');
      return;
    }

    if (type === 'transfer') {
      if (!destinationAccountId) {
        setError('Pilih rekening tujuan terlebih dahulu.');
        return;
      }
      if (accountId === destinationAccountId) {
        setError('Rekening sumber dan tujuan tidak boleh sama.');
        return;
      }
    }

    // Validate recurring fields using the Zod schema
    if (isRecurring) {
      try {
        recurringTransactionSchema.parse({
          isRecurring,
          recurringFrequency,
          recurringEndDate
        });
      } catch (zodErr: any) {
        if (zodErr instanceof z.ZodError) {
          setError(zodErr.issues[0]?.message || 'Validasi transaksi rutin gagal.');
        } else {
          setError('Validasi transaksi rutin gagal.');
        }
        return;
      }
    }

    const recurringConfig = (isRecurring && type === 'pengeluaran') ? {
      isRecurring: true,
      recurringFrequency,
      recurringEndDate: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null
    } : undefined;

    if (type !== 'transfer' && isSplit && !transactionToEdit) {
      const validRows = splitRows.filter(r => r.category);
      if (validRows.length < 2) {
        setError('Harap masukkan rincian pembagian kategori untuk setidaknya 2 baris.');
        return;
      }

      if (!isSplitBalanced) {
        setError(`Total rincian (${formatIDR(splitSum)}) harus sama dengan Jumlah Uang (${formatIDR(totalGrandAmount)}).`);
        return;
      }

      const splitGroupId = 'split_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);

      const payloads = validRows.map(row => ({
        type,
        amount: parseFloat(row.amount) || 0,
        category: row.category,
        subcategory: row.subcategory || '',
        date,
        description: row.description || description || `Bagi Transaksi - ${row.category}`,
        accountId: parseInt(accountId) as unknown as string,
        assetId: assetId ? (parseInt(assetId) as unknown as string) : undefined,
        tagId: tagId ? (parseInt(tagId) as unknown as string) : undefined,
        contactId: contactId ? (parseInt(contactId) as unknown as string) : undefined,
        periodId: matchedPeriod ? String(matchedPeriod.id) : undefined,
        splitGroupId: splitGroupId,
        attachmentUrl: attachmentUrl || null,
        recurringConfig
      }));

      setIsSubmitting(true);
      try {
        await onSave(payloads);
        setToastMessage('Transaksi bagi (split) berhasil disimpan!');
        setAmount('');
        setCategory('');
        setSubcategory('');
        setDescription('');
        setAttachmentUrl('');
        setIsRecurring(false);
        setRecurringFrequency('MONTHLY');
        setRecurringEndDate(null);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Gagal menyimpan transaksi bagi.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!category && type !== 'transfer') {
        setError('Pilih kategori terlebih dahulu.');
        return;
      }

      if (!subcategory && type !== 'transfer') {
        setError('Pilih sub-kategori terlebih dahulu.');
        return;
      }

      const payload = {
        type,
        amount: parsedAmount,
        category: type === 'transfer' ? 'Transfer' : category,
        subcategory: type === 'transfer' ? 'Transfer' : subcategory,
        date,
        description,
        accountId: parseInt(accountId) as unknown as string,
        destinationAccountId: destinationAccountId ? (parseInt(destinationAccountId) as unknown as string) : undefined,
        assetId: assetId ? (parseInt(assetId) as unknown as string) : undefined,
        tagId: tagId ? (parseInt(tagId) as unknown as string) : undefined,
        contactId: contactId ? (parseInt(contactId) as unknown as string) : undefined,
        periodId: matchedPeriod ? String(matchedPeriod.id) : undefined,
        attachmentUrl: attachmentUrl || null,
        recurringConfig
      };

      if (transactionToEdit) {
        setIsSubmitting(true);
        try {
          await onSave(payload, transactionToEdit.id);
          onClose();
        } catch (err: any) {
          setError(err.message || 'Gagal menyimpan transaksi.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        setIsSubmitting(true);
        try {
          await onSave(payload);
          setToastMessage('Transaksi berhasil disimpan!');
          setAmount('');
          setCategory('');
          setSubcategory('');
          setDescription('');
          setAttachmentUrl('');
          setIsRecurring(false);
          setRecurringFrequency('MONTHLY');
          setRecurringEndDate(null);
          onClose();
        } catch (err: any) {
          setError(err.message || 'Gagal menyimpan transaksi.');
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddName || !quickAddType || !onSaveMasterData) return;
    try {
      if (quickAddType === 'accounts') {
        const newId = await onSaveMasterData('accounts', { accountName: quickAddName, accountType: 'Cash', balance: 0, isActive: true });
        if (typeof newId === 'string') setAccountId(String(newId));
      } else if (quickAddType === 'assets') {
        const newId = await onSaveMasterData('assets', { assetName: quickAddName, assetCategory: 'Gold', currentValue: 0, isActive: true });
        if (typeof newId === 'string') setAssetId(String(newId));
      } else if (quickAddType === 'tags') {
        const newId = await onSaveMasterData('tags', { tagName: quickAddName, description: '', isActive: true });
        if (typeof newId === 'string') setTagId(String(newId));
      } else if (quickAddType === 'contacts') {
        const newId = await onSaveMasterData('contacts', { contactName: quickAddName, contactType: 'Payee', isActive: true });
        if (typeof newId === 'string') setContactId(String(newId));
      }

      setQuickAddType(null);
      setQuickAddName('');
      setQuickAddSub('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-xl z-[100] flex items-center gap-2 animate-bounce border border-amber-400">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header & Tabs (Sticky) */}
        <div className="bg-gray-50/50 border-b border-gray-100 shrink-0">
          <div className="px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {transactionToEdit ? '✏️ Edit Transaksi' : '➕ Catat Transaksi Baru'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="px-6 pb-4">
            <div className="flex bg-gray-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { 
                  setType('pengeluaran'); 
                  setCategory(''); 
                  setSubcategory(''); 
                  setDestinationAccountId(''); 
                  setIsSplit(false);
                  setSplitRows([
                    { category: '', subcategory: '', amount: '', description: '' },
                    { category: '', subcategory: '', amount: '', description: '' }
                  ]);
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                  type === 'pengeluaran' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => { 
                  setType('pemasukan'); 
                  setCategory(''); 
                  setSubcategory(''); 
                  setDestinationAccountId(''); 
                  setIsSplit(false);
                  setSplitRows([
                    { category: '', subcategory: '', amount: '', description: '' },
                    { category: '', subcategory: '', amount: '', description: '' }
                  ]);
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                  type === 'pemasukan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => { 
                  setType('transfer'); 
                  setCategory(''); 
                  setSubcategory(''); 
                  setIsSplit(false); 
                  setDestinationAccountId(''); 
                  setSplitRows([
                    { category: '', subcategory: '', amount: '', description: '' },
                    { category: '', subcategory: '', amount: '', description: '' }
                  ]);
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                  type === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0 flex-1">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 text-red-700 text-xs font-semibold p-3 rounded-lg border-l-4 border-red-500">
                {error}
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Jumlah Uang
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <span className="text-gray-400 font-bold text-sm">Rp</span>
                </div>
                <NumericFormat
                  value={amount}
                  onValueChange={(values) => setAmount(values.value)}
                  thousandSeparator="."
                  decimalSeparator=","
                  allowNegative={false}
                  placeholder="0"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Split Transaction Toggle */}
            {type !== 'transfer' && !transactionToEdit && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl shrink-0">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Bagi Transaksi (Split)</span>
                  <span className="text-[10px] text-slate-400">Pecah pengeluaran/pemasukan ke beberapa kategori</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSplit(!isSplit)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSplit ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isSplit ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Category & Sub-category */}
            {type !== 'transfer' && (
              isSplit && !transactionToEdit ? (
                <div className="space-y-4 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Rincian Pembagian Kategori</span>
                  <button
                    type="button"
                    onClick={() => setSplitRows([...splitRows, { category: '', subcategory: '', amount: '', description: '' }])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 bg-white border border-indigo-100 px-2 py-1 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Plus size={12} /> Tambah Rincian
                  </button>
                </div>

                <div className="space-y-3">
                  {splitRows.map((row, index) => {
                    const rowSubcategories = getSubcategoriesForCategory(row.category);
                    return (
                      <div key={index} className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-1.5 relative group/row shadow-none">
                        {/* Remove Row Button */}
                        <button
                          type="button"
                          disabled={splitRows.length <= 2}
                          onClick={() => {
                            if (splitRows.length > 2) {
                              setSplitRows(splitRows.filter((_, i) => i !== index));
                            }
                          }}
                          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200 ${
                            splitRows.length <= 2
                              ? 'text-slate-200 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer'
                          }`}
                          title={splitRows.length <= 2 ? "Minimal harus memiliki 2 rincian" : "Hapus rincian ini"}
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="grid grid-cols-2 gap-2 pr-6">
                          {/* Main Category */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Kategori Utama
                            </label>
                            <select
                              value={row.category}
                              onChange={(e) => {
                                const newRows = [...splitRows];
                                newRows[index].category = e.target.value;
                                newRows[index].subcategory = ''; // Reset sub
                                setSplitRows(newRows);
                              }}
                              className="block w-full px-2 py-1 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="" disabled>Pilih...</option>
                              {availableCategories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Sub Category */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Sub-Kategori
                            </label>
                            <select
                              value={row.subcategory}
                              onChange={(e) => {
                                const newRows = [...splitRows];
                                newRows[index].subcategory = e.target.value;
                                setSplitRows(newRows);
                              }}
                              className="block w-full px-2 py-1 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="" disabled>Pilih...</option>
                              {rowSubcategories.map((sub, idx) => (
                                <option key={idx} value={sub}>
                                  {sub}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pr-6">
                          {/* Nominal */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Nominal (Rp)
                            </label>
                            <NumericFormat
                              value={row.amount}
                              onValueChange={(values) => {
                                const newRows = [...splitRows];
                                newRows[index].amount = values.value;
                                setSplitRows(newRows);
                              }}
                              thousandSeparator="."
                              decimalSeparator=","
                              allowNegative={false}
                              placeholder="0"
                              className="block w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>

                          {/* Description/Catatan */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              Catatan Rincian
                            </label>
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => {
                                const newRows = [...splitRows];
                                newRows[index].description = e.target.value;
                                setSplitRows(newRows);
                              }}
                              placeholder="Keterangan rincian..."
                              className="block w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mathematical Validation Helper Text */}
                <div className={`p-3.5 rounded-xl border-2 text-xs font-bold flex items-center justify-between transition-all shadow-xs ${
                  isSplitBalanced
                    ? 'bg-green-50 text-green-800 border-green-500'
                    : 'bg-red-50 text-red-800 border-red-500'
                }`}>
                  <span className="tabular-nums text-[13px] tracking-tight">
                    Total Rincian: {formatIDR(splitSum)} / {formatIDR(totalGrandAmount)}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider">
                    {isSplitBalanced ? (
                      <span className="flex items-center gap-1.5 text-green-700 bg-green-100/80 px-2.5 py-1 rounded-md border border-green-200">
                        <Check size={14} className="stroke-[3px]" /> Seimbang (Sesuai)
                      </span>
                    ) : splitSum > totalGrandAmount ? (
                      <span className="text-red-700 bg-red-100/80 px-2.5 py-1 rounded-md border border-red-200">
                        Kelebihan {formatIDR(splitSum - totalGrandAmount)}
                      </span>
                    ) : (
                      <span className="text-red-700 bg-red-100/80 px-2.5 py-1 rounded-md border border-red-200">
                        Kurang {formatIDR(totalGrandAmount - splitSum)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Kategori Utama
                    </label>
                    {onSaveMasterData && (
                      <button type="button" onClick={() => setQuickAddType('categories')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center cursor-pointer">
                        <Plus size={10} className="mr-0.5" /> Tambah
                      </button>
                    )}
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>Pilih Kategori...</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sub-Kategori
                    </label>
                    {onSaveMasterData && (
                      <button 
                        type="button" 
                        onClick={handleSubCategoryQuickAddClick} 
                        className={`text-[10px] font-bold flex items-center cursor-pointer transition-all ${
                          category 
                            ? 'text-indigo-600 hover:underline' 
                            : 'text-gray-400 opacity-60 hover:text-gray-500'
                        }`}
                      >
                        <Plus size={10} className="mr-0.5" /> Tambah
                      </button>
                    )}
                  </div>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>Pilih Sub-Kategori...</option>
                    {availableSubcategories.length === 0 && <option value="">- Kosong -</option>}
                    {availableSubcategories.map((sub, idx) => (
                      <option key={idx} value={sub}>
                        {sub}
                      </option>
                    ))}
                    {subcategory && !availableSubcategories.includes(subcategory) && (
                      <option value={subcategory}>
                        {subcategory}
                      </option>
                    )}
                  </select>
                </div>
              </div>
              )
            )}

            {/* Account/Source of Funds */}
            {type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Rekening Asal <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>Pilih Rekening Asal...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.accountType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Rekening Tujuan <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <select
                    required
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>Pilih Rekening Tujuan...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                        {acc.accountName} - {acc.accountType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Sumber Dana (Rekening) <span className="text-red-500">*</span>
                </label>
                {onSaveMasterData && (
                  <button type="button" onClick={() => setQuickAddType('accounts')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center cursor-pointer">
                    <Plus size={10} className="mr-0.5" /> Tambah
                  </button>
                )}
              </div>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>Pilih Rekening...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} - {acc.accountType}
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 font-medium">⚠️ Anda belum memiliki master data rekening.</p>
              )}
            </div>
            )}

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Tanggal Transaksi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <DatePicker
                  selected={date ? new Date(date) : new Date()}
                  onChange={(d: Date | null) => setDate(d ? d.toISOString().split('T')[0] : '')}
                  dateFormat="dd/MM/yyyy"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  wrapperClassName="w-full"
                />
              </div>
              {isRecurring && type === 'pengeluaran' && (
                <p className="text-[10px] text-indigo-600 font-bold mt-1.5 flex items-center gap-1">
                  💡 Ini akan menjadi tanggal mulai (Start Date) dari transaksi rutin Anda.
                </p>
              )}
              {matchedPeriod ? (
                <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                  ✓ Masuk ke periode anggaran: {matchedPeriod.name}
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                  ⚠️ Periode untuk tanggal ini belum dibuat di Master Data.
                </p>
              )}
            </div>

            {/* Jadikan Transaksi Rutin / Berulang - Hanya untuk Pengeluaran */}
            {type === 'pengeluaran' && (
              <>
                <div className="flex items-center justify-between p-3 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Jadikan Transaksi Rutin / Berulang
                    </span>
                    <span className="text-[10px] text-gray-400">Otomatisasi pencatatan transaksi di masa mendatang</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRecurring}
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isRecurring ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isRecurring ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Recurring payment fields config container */}
                {isRecurring && (
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 shadow-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">
                          Frekuensi
                        </label>
                        <select
                          value={recurringFrequency}
                          onChange={(e) => setRecurringFrequency(e.target.value as any)}
                          className="block w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-700"
                        >
                          <option value="DAILY">Harian (Daily)</option>
                          <option value="WEEKLY">Mingguan (Weekly)</option>
                          <option value="MONTHLY">Bulanan (Monthly)</option>
                          <option value="YEARLY">Tahunan (Yearly)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">
                          Batas Akhir (Opsional)
                        </label>
                        <DatePicker
                          selected={recurringEndDate}
                          onChange={(d: Date | null) => setRecurringEndDate(d)}
                          placeholderText="Tanpa Batas Akhir"
                          dateFormat="dd/MM/yyyy"
                          isClearable
                          className="block w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-700"
                          wrapperClassName="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Notes/Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none z-10">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Makan siang bersama tim, bensin bulanan..."
                  rows={2}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Receipt Attachment Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Lampiran Struk Belanja (Opsional)
              </label>
              
              {attachmentUrl ? (
                // Thumbnail view with X button
                <div className="relative flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-slate-50/50">
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-slate-100 border border-gray-100 flex items-center justify-center shrink-0">
                    <img
                      src={attachmentUrl}
                      alt="Thumbnail Struk"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-750 truncate">Struk berhasil dilampirkan</p>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      Lihat Gambar Penuh
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl('')}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                    title="Hapus Struk"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                // Upload dropzone view
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                  className={`border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-4 transition-colors text-center cursor-pointer relative ${
                    isUploading ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                  onClick={() => {
                    if (!isUploading) {
                      document.getElementById('receipt-upload-input')?.click();
                    }
                  }}
                >
                  <input
                    id="receipt-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0]);
                      }
                    }}
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                      <p className="text-xs font-bold text-gray-500">Mengunggah struk ke cloud...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <PlusCircle className="h-6 w-6 text-indigo-500" />
                      <p className="text-xs font-bold text-gray-750">
                        Unggah Bukti Struk (JPG, PNG, WEBP)
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Seret & letakkan atau klik untuk memilih file
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Options Accordion */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30 shrink-0">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <span>⚙️ Opsi Lanjutan (Aset, Proyek, Kontak)</span>
                {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {isAdvancedOpen && (
                <div className="p-4 border-t border-gray-200 space-y-4">
                  {/* Asset */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Aset Terkait (Opsional)
                      </label>
                      {onSaveMasterData && (
                        <button type="button" onClick={() => setQuickAddType('assets')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center cursor-pointer">
                          <Plus size={10} className="mr-0.5" /> Tambah
                        </button>
                      )}
                    </div>
                    <select
                      value={assetId}
                      onChange={(e) => setAssetId(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">- Tidak ada aset -</option>
                      {assets.map((ast) => (
                        <option key={ast.id} value={ast.id}>
                          {ast.assetName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tag */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Proyek / Tag (Opsional)
                      </label>
                      {onSaveMasterData && (
                        <button type="button" onClick={() => setQuickAddType('tags')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center cursor-pointer">
                          <Plus size={10} className="mr-0.5" /> Tambah
                        </button>
                      )}
                    </div>
                    <select
                      value={tagId}
                      onChange={(e) => setTagId(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">- Tidak ada tag -</option>
                      {tags.map((tg) => (
                        <option key={tg.id} value={tg.id}>
                          {tg.tagName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contact */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Pihak Terkait (Opsional)
                      </label>
                      {onSaveMasterData && (
                        <button type="button" onClick={() => setQuickAddType('contacts')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center cursor-pointer">
                          <Plus size={10} className="mr-0.5" /> Tambah
                        </button>
                      )}
                    </div>
                    <select
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">- Tidak ada kontak -</option>
                      {contacts.map((cnt) => (
                        <option key={cnt.id} value={cnt.id}>
                          {cnt.contactName} ({cnt.contactType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons (Sticky Footer) */}
          <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCreating || (isSplit && !isSplitBalanced && !transactionToEdit)}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isCreating ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check size={16} />
                  Simpan Catatan
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Add Modal overlay */}
        {quickAddType === 'accounts' && onSaveMasterData && (
          <CreateMasterAccountModal
            onClose={() => setQuickAddType(null)}
            onSave={onSaveMasterData}
            onSuccess={(newId) => {
              setAccountId(String(newId));
              setQuickAddType(null);
            }}
          />
        )}
        
        {quickAddType === 'categories' && onSaveMasterData && (
          <CreateMasterCategoryModal
            onClose={() => setQuickAddType(null)}
            onSave={onSaveMasterData}
            initialType={type === 'pengeluaran' ? 'pengeluaran' : 'pemasukan'}
            onSuccess={(newId, categoryName) => {
              setCategory(categoryName);
              setQuickAddType(null);
            }}
            allCategories={categories}
          />
        )}

        {isSubCategoryModalOpen && onSaveMasterData && (
          <CreateSubCategoryModal
            onClose={() => setIsSubCategoryModalOpen(false)}
            onSave={onSaveMasterData}
            type={type === 'pengeluaran' ? 'pengeluaran' : 'pemasukan'}
            parentCategoryId={selectedCategoryObj?.id || ''}
            parentCategoryName={selectedCategoryObj?.name || category}
            onSuccess={(newId, subCategoryName) => {
              setSubcategory(subCategoryName);
              setIsSubCategoryModalOpen(false);
            }}
          />
        )}
        
        {quickAddType && quickAddType !== 'accounts' && quickAddType !== 'categories' && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-5 w-full">
              <h3 className="font-bold text-gray-900 mb-4">Tambah {quickAddType}</h3>
              <input 
                type="text"
                placeholder="Nama..."
                value={quickAddName}
                onChange={e => setQuickAddName(e.target.value)}
                className="block w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setQuickAddType(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">Batal</button>
                <button type="button" onClick={handleQuickAdd} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer">Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
