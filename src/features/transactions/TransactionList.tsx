import { useState, useMemo } from 'react';
import { useGetTransactions } from '@/features/transactions/useTransactions';
import { Transaction, Category, BudgetPeriod, MasterAccount } from '@/types';
import { 
  Trash2, Download, Edit2, Search, Filter, 
  ArrowLeftRight, BookOpen,
  ChevronDown, ChevronUp, Paperclip, Receipt, X
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionListProps {
  categories: Category[];
  periods: BudgetPeriod[];
  accounts?: MasterAccount[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function TransactionList({ categories, periods, accounts = [], onEdit, onDelete }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'semua' | 'pemasukan' | 'pengeluaran' | 'transfer'>('semua');
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('semua');
  const [periodFilter, setPeriodFilter] = useState('semua');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const currentFilters = { typeFilter, categoryFilter, periodFilter, searchTerm };
  const { data: rawTransactions, isLoading, isError } = useGetTransactions(currentFilters);
  const transactions = rawTransactions || [];

  // Extract unique categories currently used in transactions to populate filter dropdown
  const uniqueCategoriesUsed = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [transactions]);

  // Filter transactions based on type, category, and search text
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesType = typeFilter === 'semua' || t.type === typeFilter;
        const matchesCategory = categoryFilter === 'semua' || t.category === categoryFilter;
        const searchLower = (searchTerm || '').toLowerCase();
        const matchesSearch = 
          (t.description || '').toLowerCase().includes(searchLower) ||
          (t.subcategory || '').toLowerCase().includes(searchLower) ||
          (t.category || '').toLowerCase().includes(searchLower);
        let matchesPeriod = true;
        if (periodFilter !== 'semua') {
            const selectedPeriod = periods.find(p => p.id === periodFilter);
            if (selectedPeriod) {
                const tDate = new Date(t.date);
                const sDate = new Date(selectedPeriod.startDate);
                const eDate = new Date(selectedPeriod.endDate);
                matchesPeriod = tDate >= sDate && tDate <= eDate;
            }
        }
        return matchesType && matchesCategory && matchesSearch && matchesPeriod;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // descending order by date
  }, [transactions, searchTerm, typeFilter, categoryFilter, periodFilter, periods]);

  // Group transactions by date

  const handleExportExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      'Tanggal': new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      'Tipe': t.type === 'pemasukan' ? 'Pemasukan' : t.type === 'transfer' ? 'Transfer' : 'Pengeluaran',
      'Kategori': t.category,
      'Sumber Dana': t.accountId,
      'Catatan': t.description,
      'Nominal': t.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    
    XLSX.writeFile(workbook, "Laporan_Transaksi.xlsx");
  };
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const dateStr = t.date;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedTransactions]);

  const formatDateHeader = (dateString: string) => {
    if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getAccountName = (accountId: string | number | undefined) => {
    if (!accountId) return '';
    const idStr = accountId.toString();
    const acc = accounts.find(a => a.id === idStr);
    return acc ? acc.accountName : idStr;
  };

  // Dynamically map category names to Lucide icons
  const renderCategoryIcon = (categoryName: string) => {
    let iconName = 'HelpCircle';
    let color: string | undefined = undefined;
    const predefined = categories.find(c => c.name === categoryName || c.id === (categoryName || '').toLowerCase());
    
    if (predefined) {
      if (predefined.iconName) {
        iconName = predefined.iconName;
      }
      if (predefined.colorHex || predefined.color_hex) {
        color = predefined.colorHex || predefined.color_hex;
      }
    }
    
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return <IconComponent size={16} style={color ? { color } : undefined} />;
  };

  // Get color styles for the category badge
  const getCategoryColor = (categoryName: string) => {
    const predefined = categories.find(c => c.name === categoryName || c.id === (categoryName || '').toLowerCase());
    if (predefined) {
      if (predefined.colorHex || predefined.color_hex) {
        const hex = predefined.colorHex || predefined.color_hex;
        return {
          color: hex,
          backgroundColor: `${hex}15`,
          borderColor: `${hex}30`
        };
      }
      return predefined.colorClass;
    }
    
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6 font-sans">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">📑 Semua Transaksi</h3>
          <p className="text-xs text-gray-400">Kelola dan telusuri semua catatan pengeluaran & pemasukan Anda</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="text-xs text-gray-500 font-semibold bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-100">
            Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-white border border-gray-200 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Filter size={14} />
            Saring & Cari
          </div>
          {(typeFilter !== 'semua' || categoryFilter !== 'semua' || periodFilter !== 'semua') && (
            <button
              onClick={() => {
                setTypeFilter('semua');
                setCategoryFilter('semua');
                setPeriodFilter('semua');
                setSearchTerm('');
              }}
              className="text-xs font-extrabold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X size={14} />
              Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari catatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="semua">Semua Tipe</option>
            <option value="pengeluaran">💸 Hanya Pengeluaran</option>
            <option value="pemasukan">💰 Hanya Pemasukan</option>
            <option value="transfer">🔄 Hanya Transfer</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="semua">Semua Kategori</option>
            {uniqueCategoriesUsed.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        {/* Period Filter */}
        <div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="semua">Semua Periode</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>

      {/* Summary Row */}
      {(() => {
        const totalIncome = filteredTransactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalIncome - totalExpense;

        return (
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pemasukan</p>
              <p className="text-base font-black text-emerald-600 tabular-nums">+{formatIDR(totalIncome)}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <div className="flex-1 sm:text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pengeluaran</p>
              <p className="text-base font-black text-red-600 tabular-nums">-{formatIDR(totalExpense)}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <div className="flex-1 sm:text-right">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Saldo Bersih</p>
              <p className={`text-base font-black tabular-nums ${netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {netBalance >= 0 ? '+' : ''}{formatIDR(netBalance)}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Transactions List */}
      <div className="overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-500">
            Terjadi kesalahan saat memuat data.
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-gray-500">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Coba sesuaikan filter pencarian atau tambahkan transaksi baru untuk memulai pencatatan.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dayTransactions = groupedTransactions[date];
              const totalIncome = dayTransactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + t.amount, 0);
              const totalExpense = dayTransactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + t.amount, 0);

              // Group day transactions by splitGroupId
              const itemsToRender: {
                id: string;
                isGroup: boolean;
                splitGroupId?: string;
                transaction?: Transaction;
                children?: Transaction[];
              }[] = [];

              const processedSplitGroups = new Set<string>();

              dayTransactions.forEach(t => {
                if (t.splitGroupId) {
                  if (!processedSplitGroups.has(t.splitGroupId)) {
                    processedSplitGroups.add(t.splitGroupId);
                    const groupChildren = dayTransactions.filter(item => item.splitGroupId === t.splitGroupId);
                    itemsToRender.push({
                      id: t.splitGroupId,
                      isGroup: true,
                      splitGroupId: t.splitGroupId,
                      children: groupChildren
                    });
                  }
                } else {
                  itemsToRender.push({
                    id: t.id,
                    isGroup: false,
                    transaction: t
                  });
                }
              });

              return (
                <div key={date} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {/* Date Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-5 py-3.5 border-b border-gray-200 sticky top-0 z-10 w-full">
                    <span className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      📅 {formatDateHeader(date)}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-black">
                      {totalIncome > 0 && <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">+{formatIDR(totalIncome)}</span>}
                      {totalExpense > 0 && <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">-{formatIDR(totalExpense)}</span>}
                    </div>
                  </div>

                  {/* Transaction Items */}
                  <div className="divide-y divide-gray-100">
                    {itemsToRender.map((item) => {
                      if (item.isGroup) {
                        const children = item.children || [];
                        const firstChild = children[0];
                        if (!firstChild) return null;
                        
                        const grandTotal = children.reduce((sum, c) => sum + c.amount, 0);
                        const isExpanded = expandedGroups.has(item.splitGroupId!);
                        const type = firstChild.type;
                        const hasAttachment = children.some(c => !!c.attachmentUrl);
                        const attachmentUrl = children.find(c => !!c.attachmentUrl)?.attachmentUrl;

                        return (
                          <div key={item.id} className="border-b border-gray-100 last:border-b-0">
                            {/* Parent Row */}
                            <div 
                              onClick={() => toggleGroup(item.splitGroupId!)}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80 cursor-pointer group select-none"
                            >
                              {/* Left block (Split Icon, Title, Parts count, Account) */}
                              <div className="flex items-start gap-4 flex-1">
                                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border bg-indigo-600 text-white border-indigo-700 shadow-sm">
                                  <Receipt size={18} />
                                </div>
                                
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-sm text-gray-800">Struk Multi-Kategori</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                      🥞 Split ({children.length} Kategori)
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                    {firstChild.accountId && (
                                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                                        🏦 {getAccountName(firstChild.accountId)}
                                      </span>
                                    )}
                                    <span className="text-gray-400 font-medium">Klik untuk rincian</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right block (Grand Total, Paperclip, and Chevron) */}
                              <div className="flex items-center justify-between sm:justify-end gap-4">
                                {hasAttachment && attachmentUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAttachmentUrl(attachmentUrl);
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title="Lihat Struk"
                                  >
                                    <Paperclip size={16} />
                                  </button>
                                )}
                                <span className={`text-sm font-black tabular-nums ${type === 'pemasukan' ? 'text-emerald-700' : 'text-red-600'}`}>
                                  {type === 'pemasukan' ? '+' : '-'} {formatIDR(grandTotal)}
                                </span>
                                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                              </div>
                            </div>

                            {/* Children Expandable Section */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-slate-50/50 pl-12 pr-4 py-2 border-t border-gray-100 divide-y divide-gray-100/60 border-l-4 border-indigo-500/60">
                                    {children.map((child) => (
                                      <div 
                                        key={child.id}
                                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group/child"
                                      >
                                        <div className="flex items-start gap-3 flex-1">
                                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border bg-white border-gray-100">
                                            {renderCategoryIcon(child.category)}
                                          </div>
                                          
                                          <div className="space-y-1 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="font-bold text-xs text-gray-700">{child.subcategory}</span>
                                              {(() => {
                                                const colStyleOrClass = getCategoryColor(child.category);
                                                const isStyleObj = typeof colStyleOrClass === 'object';
                                                return (
                                                  <span 
                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${isStyleObj ? '' : colStyleOrClass}`}
                                                    style={isStyleObj ? colStyleOrClass : undefined}
                                                  >
                                                    {child.category}
                                                  </span>
                                                );
                                              })()}
                                            </div>
                                            {child.description && (
                                              <p className="text-[11px] text-gray-500 font-medium">💬 {child.description}</p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                          <div className="flex items-center gap-1.5">
                                            {child.attachmentUrl && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedAttachmentUrl(child.attachmentUrl!);
                                                }}
                                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                                title="Lihat Struk"
                                              >
                                                <Paperclip size={12} />
                                              </button>
                                            )}
                                            <span className={`text-xs font-extrabold tabular-nums ${child.type === 'pemasukan' ? 'text-emerald-700' : 'text-red-600'}`}>
                                              {child.type === 'pemasukan' ? '+' : '-'} {formatIDR(child.amount)}
                                            </span>
                                          </div>
                                          
                                          {/* Actions */}
                                          <div className="flex items-center gap-1 md:hidden md:group-hover/child:flex transition-opacity focus-within:flex">
                                            {confirmDeleteId === child.id ? (
                                              <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-100">
                                                <span className="text-[9px] font-bold text-red-600 px-1">Hapus?</span>
                                                <button
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await onDelete(child.id);
                                                    setConfirmDeleteId(null);
                                                  }}
                                                  className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-extrabold hover:bg-red-700 transition-colors cursor-pointer"
                                                >
                                                  Ya
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(null);
                                                  }}
                                                  className="px-1.5 py-0.5 bg-white text-gray-700 rounded text-[9px] font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                                                >
                                                  Batal
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(child);
                                                  }}
                                                  className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                                  title="Ubah Transaksi"
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(child.id);
                                                  }}
                                                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                  title="Hapus Transaksi"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      } else {
                        const t = item.transaction!;
                        return (
                          <div 
                            key={t.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-gray-50/50 group"
                          >
                            {/* Left block (Icon, Subcategory, Category, Notes) */}
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                t.type === 'pemasukan' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : t.type === 'transfer'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {t.type === 'transfer' ? <ArrowLeftRight size={20} /> : renderCategoryIcon(t.category)}
                              </div>
                              
                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-sm text-gray-800">{t.subcategory}</span>
                                  {(() => {
                                    const colStyleOrClass = getCategoryColor(t.category);
                                    const isStyleObj = typeof colStyleOrClass === 'object';
                                    return (
                                      <span 
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isStyleObj ? '' : colStyleOrClass}`}
                                        style={isStyleObj ? colStyleOrClass : undefined}
                                      >
                                        {t.category}
                                      </span>
                                    );
                                  })()}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                  {t.accountId && t.type !== 'transfer' && (
                                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                                      🏦 {getAccountName(t.accountId)}
                                    </span>
                                  )}
                                  {t.type === 'transfer' && t.accountId && t.destinationAccountId && (
                                    <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                                      🏦 {getAccountName(t.accountId)} <ArrowLeftRight size={12} /> {getAccountName(t.destinationAccountId)}
                                    </span>
                                  )}
                                  {t.isRecurring && (
                                    <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 flex items-center gap-1">
                                      🔄 Rutin ({t.recurringFrequency === 'DAILY' ? 'Harian' : t.recurringFrequency === 'WEEKLY' ? 'Mingguan' : t.recurringFrequency === 'MONTHLY' ? 'Bulanan' : t.recurringFrequency === 'YEARLY' ? 'Tahunan' : 'Berulang'}{t.recurringEndDate ? `, s/d ${new Date(t.recurringEndDate).toLocaleDateString('id-ID')}` : ''})
                                    </span>
                                  )}
                                  {t.description && (
                                    <span className="text-gray-500 font-medium">💬 {t.description}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right block (Amount and Actions) */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                              <div className="flex items-center gap-2">
                                {t.attachmentUrl && (
                                  <button
                                    onClick={() => setSelectedAttachmentUrl(t.attachmentUrl!)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title="Lihat Struk"
                                  >
                                    <Paperclip size={16} />
                                  </button>
                                )}
                                <span className={`text-sm font-black tabular-nums ${t.type === 'pemasukan' ? 'text-emerald-700' : t.type === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                                  {t.type === 'pemasukan' ? '+' : t.type === 'transfer' ? '⇄' : '-'} {formatIDR(t.amount)}
                                </span>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1.5 md:hidden md:group-hover:flex transition-opacity focus-within:flex">
                                {confirmDeleteId === t.id ? (
                                  <div className="flex items-center gap-1 animate-fade-in bg-red-50 p-1 rounded-lg border border-red-100">
                                    <span className="text-[10px] font-bold text-red-600 px-1">Hapus?</span>
                                    <button
                                      onClick={async () => {
                                        await onDelete(t.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-extrabold hover:bg-red-700 transition-colors cursor-pointer"
                                    >
                                      Ya
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 bg-white text-gray-700 rounded text-[10px] font-semibold hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => onEdit(t)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      title="Ubah Transaksi"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(t.id)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Hapus Transaksi"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Receipt Attachment Viewer */}
      <AnimatePresence>
        {selectedAttachmentUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedAttachmentUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  🧾 Bukti Fisik Struk Transaksi
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Buka di Tab Baru"
                  >
                    <Download size={18} />
                  </a>
                  <button
                    onClick={() => setSelectedAttachmentUrl(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Image body */}
              <div className="p-6 flex items-center justify-center bg-slate-900 max-h-[75vh] overflow-auto">
                <img
                  src={selectedAttachmentUrl}
                  alt="Struk Transaksi"
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md border border-slate-800"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
