import React, { useState, useEffect } from 'react';
import CreateMasterAccountModal from '@/components/ui/CreateMasterAccountModal';
import CreateMasterCategoryModal from '@/components/ui/CreateMasterCategoryModal';
import CreateMasterPeriodModal from '@/components/ui/CreateMasterPeriodModal';
import { masterDataService, subscribeToCollection } from '@/services/dbServices';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  Category, BudgetPeriod,
  MasterAccount, MasterAsset, MasterTag, MasterContact,
  Transaction, BudgetAllocation
} from '@/types';
import { 
  HelpCircle, Calendar, Plus, Trash2, 
  Wallet, TrendingUp, Tags, Users, ChevronDown, Edit2, Search, MoreVertical, 
  Pencil, X 
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  customCategories: any[];
  periods: BudgetPeriod[];
  accounts: MasterAccount[];
  assets: MasterAsset[];
  tags: MasterTag[];
  contacts: MasterContact[];
  transactions: Transaction[];
  budgets: BudgetAllocation[];
  dbUser?: any;
  onSavePeriod: (name: string, id?: string) => Promise<string | void>;
  onDeletePeriod: (id: string) => Promise<string | void>;
  onSaveMasterData: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  onDeleteMasterData: (collectionName: string, id: string) => Promise<string | void>;
  onRefreshData?: () => void;
  globalAddTrigger?: number;
}

// Sub-component for Delete Confirmation Dialog
interface DeleteConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

function DeleteConfirmationModal({ onClose, onConfirm, title, message }: DeleteConfirmationModalProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 border border-gray-100">
        <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          ⚠️ {title}
        </h4>
        <p className="text-xs text-gray-500 leading-relaxed font-medium">{message}</p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-all text-xs cursor-pointer border border-gray-100"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
                onClose();
              } catch (err: any) {
                const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal menghapus';
                showToast(errMsg, 'error');
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all text-xs disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? 'Memproses...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for Rename Subcategory Dialog
interface RenameSubcategoryModalProps {
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  oldName: string;
}

function RenameSubcategoryModal({ onClose, onConfirm, oldName }: RenameSubcategoryModalProps) {
  const { showToast } = useToast();
  const [newName, setNewName] = useState(oldName);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 border border-gray-100">
        <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          📝 Ubah Nama Sub-Kategori
        </h4>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase mb-1.5 block">Nama Sub-Kategori</label>
          <input
            required
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Masukkan nama baru..."
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-all text-xs cursor-pointer border border-gray-100"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              const trimmed = newName.trim();
              if (!trimmed || trimmed === oldName) {
                onClose();
                return;
              }
              setIsSaving(true);
              try {
                await onConfirm(trimmed);
                onClose();
              } catch (err: any) {
                showToast(err.message || 'Gagal mengubah nama', 'error');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all text-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoryManager({ 
  user,
  categories: initialCategories, customCategories: initialCustomCategories, periods: initialPeriods, accounts: initialAccounts, assets: initialAssets, tags: initialTags, contacts: initialContacts, transactions, budgets,
  dbUser,
  onSavePeriod, onDeletePeriod,
  onSaveMasterData, onDeleteMasterData, onRefreshData,
  globalAddTrigger
}: CategoryManagerProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pengeluaran' | 'pemasukan' | 'periode' | 'rekening' | 'aset' | 'tag' | 'kontak'>('pengeluaran');
  
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [deleteConfirmPeriod, setDeleteConfirmPeriod] = useState<BudgetPeriod | null>(null);

  // States for CRUD & Search Features
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKebabId, setActiveKebabId] = useState<string | number | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<MasterAccount | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'subcategory' | 'account', category?: Category, subName?: string, account?: MasterAccount } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ category: Category, oldName: string } | null>(null);

  // For generic master data form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ iconName: 'Folder' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [customCategories, setCustomCategories] = useState<any[]>(initialCustomCategories);
  const [periods, setPeriods] = useState<BudgetPeriod[]>(initialPeriods);
  const [accounts, setAccounts] = useState<MasterAccount[]>(initialAccounts);
  const [assets, setAssets] = useState<MasterAsset[]>(initialAssets);
  const [tags, setTags] = useState<MasterTag[]>(initialTags);
  const [contacts, setContacts] = useState<MasterContact[]>(initialContacts);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 6) setLoading(false);
    };

    const unsubCustomCats = subscribeToCollection(user.uid, 'customCategories', (data) => {
      setCustomCategories(data);
      // Need to merge with default categories if needed, but App.tsx merges them.
      // We will just use what we have, wait, App.tsx merges them. 
      // Actually, since Categories are passed, let's just keep them or update them?
      // I will rely on the merged initialCategories for now or merge them manually if needed.
      checkLoaded();
    });
    
    const unsubPeriods = subscribeToCollection(user.uid, 'periods', (data) => {
      setPeriods(data as BudgetPeriod[]);
      checkLoaded();
    });

    const unsubAccounts = subscribeToCollection(user.uid, 'accounts', (data) => {
      setAccounts(data as MasterAccount[]);
      checkLoaded();
    });

    const unsubAssets = subscribeToCollection(user.uid, 'assets', (data) => {
      setAssets(data as MasterAsset[]);
      checkLoaded();
    });

    const unsubTags = subscribeToCollection(user.uid, 'tags', (data) => {
      setTags(data as MasterTag[]);
      checkLoaded();
    });

    const unsubContacts = subscribeToCollection(user.uid, 'contacts', (data) => {
      setContacts(data as MasterContact[]);
      checkLoaded();
    });

    return () => {
      unsubCustomCats();
      unsubPeriods();
      unsubAccounts();
      unsubAssets();
      unsubTags();
      unsubContacts();
    };
  }, [user?.uid]);

  // Sync merged categories with initialCategories from App.tsx since we don't have default cats here
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (globalAddTrigger && globalAddTrigger > 0) {
      setFormData({ type: activeTab, iconName: 'Folder' });
      setCategoryToEdit(null);
      setIsFormOpen(true);
    }
  }, [globalAddTrigger, activeTab]);

  // Reset search and menus when tab switches
  useEffect(() => {
    setSearchQuery('');
    setActiveKebabId(null);
  }, [activeTab]);

  // Real-time Search Filter for main Categories & Subcategories
  const filteredCategories = categories.filter(cat => cat.type === activeTab);
  const displayedCategories = filteredCategories.filter(cat => {
    if (!searchQuery) return true;
    const q = (searchQuery || '').toLowerCase().trim();
    const nameMatch = (cat.name || '').toLowerCase().includes(q);
    const subMatch = (cat.subcategories || []).some(sub => (sub || '').toLowerCase().includes(q));
    return nameMatch || subMatch;
  });

  const [sortColumn, setSortColumn] = useState<'name' | 'startDate' | 'endDate'>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const activePeriods = periods.filter(p => p.isActive !== false);
  const sortedPeriods = [...activePeriods].sort((a, b) => {
    let valA, valB;
    if (sortColumn === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    } else if (sortColumn === 'startDate') {
      valA = new Date(a.startDate || 0).getTime();
      valB = new Date(b.startDate || 0).getTime();
    } else {
      valA = new Date(a.endDate || 0).getTime();
      valB = new Date(b.endDate || 0).getTime();
    }
    
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: 'name' | 'startDate' | 'endDate') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleDeletePeriodLogic = async (p: BudgetPeriod) => {
    setDeletingPeriodId(p.id!);
    try {
      showToast('Menghapus periode...', 'info');
      onDeletePeriod(p.id!);
      showToast(`Periode "${p.name}" berhasil dihapus!`, 'success');
      setDeletingPeriodId(null);
      setDeleteConfirmPeriod(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal menghapus periode';
      showToast(errMsg, 'error');
      setDeletingPeriodId(null);
    }
  };

  // Perform soft deletion or deletion on a Category Card
  const handleDeleteCategory = async (cat: Category) => {
    if (!isNaN(Number(cat.id))) {
      // Custom category: call onDeleteMasterData to let server handle Soft/Hard delete logic
      await onDeleteMasterData('customCategories', String(cat.id));
    } else {
      // Predefined category: soft-delete by writing a disabled custom override record
      await onSaveMasterData('customCategories', {
        name: cat.name,
        type: cat.type,
        iconName: cat.iconName,
        colorClass: cat.colorClass,
        parentCategory: null,
        subcategories: cat.subcategories,
        isActive: false
      });
    }
  };

  // Perform soft deletion or deletion on a Subcategory Chip
  const handleDeleteSubcategory = async (cat: Category, subName: string) => {
    if (!isNaN(Number(cat.id))) {
      // Custom parent category: use dedicated subcategory deletion endpoint
      try {
        
        const newSubs = (cat.subcategories || []).filter((s: string) => s !== subName);
        await onSaveMasterData('customCategories', { ...cat, subcategories: newSubs }, String(cat.id));
      } catch (err: any) {
        throw new Error(err.response?.data?.error || 'Gagal menghapus sub-kategori');
      }
    } else {
      // Predefined parent category
      const customSub = customCategories.find(c => 
        c.parentCategory === cat.name && 
        c.type === cat.type && 
        (c.name || '').toLowerCase() === (subName || '').toLowerCase()
      );
      if (customSub) {
        // Custom subcategory of a predefined parent: delete/soft-delete record
        await onDeleteMasterData('customCategories', String(customSub.id));
      } else {
        // Predefined subcategory: soft-delete by inserting an inactive override
        await onSaveMasterData('customCategories', {
          name: subName,
          type: cat.type,
          iconName: 'Folder',
          colorClass: 'bg-indigo-50 text-indigo-600',
          parentCategory: cat.name,
          isActive: false,
          subcategories: []
        });
      }
    }
  };

  // Perform inline renaming on a Subcategory Chip
  const handleRenameSubcategory = async (cat: Category, oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) return;
    
    // Front-end unique name validation (case-insensitive)
    const isDuplicate = cat.subcategories.some(s => 
      (s || '').toLowerCase() === (newName || '').trim().toLowerCase() && 
      (s || '').toLowerCase() !== (oldName || '').toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Sub-kategori "${newName}" sudah ada di dalam kategori ini!`);
    }

    if (!isNaN(Number(cat.id))) {
      // Custom parent category: call dedicated backend endpoint
      try {
        
        const newSubs = (cat.subcategories || []).map((s: string) => s === oldName ? newName : s);
        await onSaveMasterData('customCategories', { ...cat, subcategories: newSubs }, String(cat.id));
      } catch (err: any) {
        throw new Error(err.response?.data?.error || 'Gagal mengubah nama sub-kategori');
      }
    } else {
      // Predefined parent category
      const customSub = customCategories.find(c => 
        c.parentCategory === cat.name && 
        c.type === cat.type && 
        (c.name || '').toLowerCase() === (oldName || '').toLowerCase()
      );
      if (customSub) {
        // Custom subcategory of predefined parent: rename record
        await onSaveMasterData('customCategories', { ...customSub, name: newName }, String(customSub.id));
      } else {
        // Predefined subcategory of predefined parent: soft-delete old and insert renamed new
        await onSaveMasterData('customCategories', {
          name: oldName,
          type: cat.type,
          iconName: 'Folder',
          colorClass: 'bg-indigo-50 text-indigo-600',
          parentCategory: cat.name,
          isActive: false,
          subcategories: []
        });
        await onSaveMasterData('customCategories', {
          name: newName,
          type: cat.type,
          iconName: 'Folder',
          colorClass: 'bg-indigo-50 text-indigo-600',
          parentCategory: cat.name,
          isActive: true,
          subcategories: []
        });
      }
    }
  };

  // Render Lucide icons dynamically
  const renderCategoryIcon = (iconName: string, styleColor?: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || HelpCircle;
    return <IconComponent size={18} style={styleColor ? { color: styleColor } : undefined} />;
  };

  const formatDateDDMMYYYY = (dateString?: string) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const datePart = dateString.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getPeriodStatus = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return { label: '-', color: 'bg-gray-50 text-gray-500 border-gray-200' };
    
    const startPart = startDateStr.split('T')[0];
    const endPart = endDateStr.split('T')[0];
    
    const start = new Date(startPart + 'T00:00:00');
    const end = new Date(endPart + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today < start) {
      return { label: 'Mendatang', color: 'bg-blue-50 text-blue-700 border-blue-200/60' };
    } else if (today > end) {
      return { label: 'Selesai', color: 'bg-slate-100 text-slate-600 border-slate-200/60' };
    } else {
      return { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6 font-sans animate-pulse">
        <div className="flex justify-between items-center pb-2">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-200 rounded-md"></div>
            <div className="h-3 w-64 bg-gray-100 rounded-md"></div>
          </div>
          <div className="h-10 w-32 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="flex gap-2 border-b border-gray-100 pb-2 overflow-x-auto">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-10 w-28 bg-gray-100 rounded-lg shrink-0"></div>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-gray-100 rounded-xl"></div>
          <div className="h-10 w-32 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          <div className="h-16 w-full bg-gray-100 rounded-xl"></div>
          <div className="h-16 w-full bg-gray-100 rounded-xl"></div>
          <div className="h-16 w-full bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6 font-sans">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">📚 Master Data</h3>
          <p className="text-xs text-gray-400">Master database kategori dan periode untuk klasifikasi dan anggaran</p>
        </div>
      </div>

      {/* Tab Navigation Container */}
      <div className="w-full overflow-x-auto no-scrollbar mb-4">
        <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-max">
          <button
            onClick={() => setActiveTab('pengeluaran')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'pengeluaran' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            💸 Kategori Pengeluaran
          </button>
          <button
            onClick={() => setActiveTab('pemasukan')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'pemasukan' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            💰 Kategori Pemasukan
          </button>
          <button
            onClick={() => setActiveTab('periode')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'periode' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📅 Master Periode
          </button>
          <button
            onClick={() => setActiveTab('rekening')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'rekening' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            💳 Master Rekening
          </button>
          <button
            onClick={() => setActiveTab('aset')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'aset' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📈 Master Aset
          </button>
          <button
            onClick={() => setActiveTab('tag')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'tag' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🏷️ Master Tag/Proyek
          </button>
          <button
            onClick={() => setActiveTab('kontak')}
            className={`py-2 px-4 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
              activeTab === 'kontak' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            👥 Master Kontak
          </button>
        </div>
      </div>

      {/* Action Bar Container: Search and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 w-full">
        {(activeTab === 'pengeluaran' || activeTab === 'pemasukan') ? (
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Cari kategori atau sub-kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-700 shadow-xs"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={14} />
            </div>
          </div>
        ) : (
          <div />
        )}
        
        {/* Dynamic Add Button */}
        <button
          onClick={() => {
            setFormData({ type: activeTab, iconName: 'Folder' });
            setCategoryToEdit(null);
            setAccountToEdit(null);
            setIsFormOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
        >
          <Plus size={16} /> 
          {activeTab === 'pengeluaran' ? 'Tambah Kategori' :
           activeTab === 'pemasukan' ? 'Tambah Kategori' :
           activeTab === 'rekening' ? 'Tambah Rekening' :
           activeTab === 'aset' ? 'Tambah Aset' :
           activeTab === 'tag' ? 'Tambah Tag' :
           activeTab === 'periode' ? 'Tambah Periode' :
           'Tambah Kontak'}
        </button>
      </div>

      {activeTab === 'periode' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-900">
                <tr>
                  <th className="p-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      Nama Periode
                      {sortColumn === 'name' && (
                        <ChevronDown size={14} className={sortDirection === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      )}
                    </div>
                  </th>
                  <th className="p-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('startDate')}>
                    <div className="flex items-center gap-2">
                      Tanggal Mulai
                      {sortColumn === 'startDate' && (
                        <ChevronDown size={14} className={sortDirection === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      )}
                    </div>
                  </th>
                  <th className="p-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('endDate')}>
                    <div className="flex items-center gap-2">
                      Tanggal Berakhir
                      {sortColumn === 'endDate' && (
                        <ChevronDown size={14} className={sortDirection === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      )}
                    </div>
                  </th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400 italic">Belum ada master data periode.</td>
                  </tr>
                ) : (
                  sortedPeriods.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-500" />
                          {p.name}
                        </div>
                      </td>
                      <td className="p-4">
                        {formatDateDDMMYYYY(p.startDate)}
                      </td>
                      <td className="p-4">
                        {formatDateDDMMYYYY(p.endDate)}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const status = getPeriodStatus(p.startDate, p.endDate);
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.color}`}>
                              {status.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => {
                              setFormData({ id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate });
                              setIsFormOpen(true);
                            }}
                            className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            disabled={deletingPeriodId === p.id}
                            onClick={() => setDeleteConfirmPeriod(p)}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus"
                          >
                            {deletingPeriodId === p.id ? (
                              <LucideIcons.Loader2 size={16} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'rekening' || activeTab === 'aset' || activeTab === 'tag' || activeTab === 'kontak' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              {activeTab === 'rekening' && '💳 Master Rekening (E-Wallet/Bank)'}
              {activeTab === 'aset' && '📈 Master Aset & Investasi'}
              {activeTab === 'tag' && '🏷️ Master Tag / Proyek'}
              {activeTab === 'kontak' && '👥 Master Kontak / Pihak Terkait'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'rekening' && (
              <div className="col-span-full space-y-6">
                {accounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                    <svg className="w-24 h-24 mb-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Belum ada rekening yang ditambahkan</h3>
                    <p className="text-gray-500 mb-6 max-w-sm text-sm">
                      Tambahkan rekening bank, e-wallet, atau kas tunai untuk mulai melacak keuangan Anda.
                    </p>
                    <button
                      onClick={() => {
                        setAccountToEdit(null);
                        setIsFormOpen(true);
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <Plus size={20} />
                      Tambah Rekening
                    </button>
                  </div>
                ) : (
                  Object.entries(
                  accounts.reduce((groups, account) => {
                    const group = account.accountType || 'Lainnya';
                    if (!groups[group]) groups[group] = [];
                    groups[group].push(account);
                    return groups;
                  }, {} as Record<string, MasterAccount[]>)
                ).map(([type, groupAccounts]) => (
                  <div key={type} className="space-y-3">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      {type === 'Bank' ? '������' : type === 'E-Wallet' ? '📱' : type === 'Cash' ? '💵' : type === 'Credit Card' ? '💳' : '🏷️'} {type}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupAccounts.map(item => {
                        const IconComponent = (item.icon && (LucideIcons as any)[item.icon]) ? (LucideIcons as any)[item.icon] : Wallet;
                        return (
                        <div key={item.id} className={`border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all group flex flex-row justify-between items-center gap-4 relative overflow-hidden ${item.includeInNetWorth === false ? 'opacity-80' : ''}`} style={{ borderLeftWidth: '4px', borderLeftColor: item.includeInNetWorth === false ? '#94a3b8' : (item.color || '#4f46e5') }}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-opacity-10" style={{ backgroundColor: item.includeInNetWorth === false ? '#94a3b820' : `${item.color || '#4f46e5'}20`, color: item.includeInNetWorth === false ? '#94a3b8' : (item.color || '#4f46e5') }}>
                              <IconComponent size={20} />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                              <h4 className="font-extrabold text-sm text-gray-800 uppercase truncate" title={item.accountName}>{item.accountName}</h4>
                              <p className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                                {item.accountType} {item.accountNumber && <span className="text-gray-400 font-mono font-normal"> • {item.accountNumber}</span>}
                              </p>
                              {item.includeInNetWorth === false && (
                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded mt-1 w-fit" id={`rekening-exclude-badge-${item.id}`}>
                                  <LucideIcons.EyeOff size={10} /> Dikecualikan
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saldo</span>
                              <span className={`text-sm font-semibold font-mono ${(item.currentBalance !== undefined ? item.currentBalance : item.balance) < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                Rp {(item.currentBalance !== undefined ? item.currentBalance : item.balance).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex gap-1 bg-slate-50/80 p-1 rounded-lg border border-slate-100">
                              <button onClick={() => {
                                setAccountToEdit(item);
                                setIsFormOpen(true);
                              }} className="text-slate-400 hover:text-indigo-600 hover:bg-white p-1 rounded transition-colors cursor-pointer" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setDeleteTarget({ type: 'account', account: item })} className="text-slate-400 hover:text-red-500 hover:bg-white p-1 rounded transition-colors cursor-pointer" title="Hapus"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))
                )}
              </div>
            )}

            {activeTab === 'aset' && assets.map(item => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all group flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800">{item.assetName}</h4>
                      <p className="text-xs text-gray-500 font-medium">{item.assetCategory}</p>
                    </div>
                  </div>
                  <button onClick={() => confirm('Hapus?') && onDeleteMasterData('assets', item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={16} /></button>
                </div>
                <div className="mt-2 text-sm font-bold text-slate-700">Nilai: Rp {item.currentValue.toLocaleString('id-ID')}</div>
              </div>
            ))}

            {activeTab === 'tag' && tags.map(item => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all group flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <Tags size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800">{item.tagName}</h4>
                    </div>
                  </div>
                  <button onClick={() => confirm('Hapus?') && onDeleteMasterData('tags', item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={16} /></button>
                </div>
                {item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}
              </div>
            ))}

            {activeTab === 'kontak' && contacts.map(item => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all group flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800">{item.contactName}</h4>
                      <p className="text-xs text-gray-500 font-medium">{item.contactType}</p>
                    </div>
                  </div>
                  <button onClick={() => confirm('Hapus?') && onDeleteMasterData('contacts', item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid of Categories */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedCategories.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-400 italic text-xs font-semibold">
              Tidak ada kategori yang cocok dengan pencarian Anda.
            </div>
          ) : (
            displayedCategories.map((cat) => {
              const catColor = cat.colorHex || cat.color_hex;
              return (
                <div 
                  key={cat.id} 
                  className="border border-gray-100 rounded-xl p-5 hover:shadow-md hover:shadow-gray-100/50 transition-all flex flex-col gap-3 relative group"
                >
                  {/* Header: Icon & Category Name */}
                  <div className="flex items-center gap-3 pr-8">
                    <div 
                      className={`h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 ${catColor ? '' : cat.colorClass}`}
                      style={catColor ? {
                        color: catColor,
                        backgroundColor: `${catColor}15`,
                        borderColor: `${catColor}30`
                      } : undefined}
                    >
                      {renderCategoryIcon(cat.iconName, catColor)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800">{cat.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{cat.subcategories.length} Sub-kategori</p>
                    </div>
                  </div>

                  {/* Kebab Menu (three vertical dots) - Top Right */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => setActiveKebabId(activeKebabId === cat.id ? null : cat.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeKebabId === cat.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveKebabId(null)} />
                        <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden font-sans">
                          <button
                            onClick={() => {
                              setActiveKebabId(null);
                              setCategoryToEdit(cat);
                              setFormData({ type: activeTab });
                              setIsFormOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-extrabold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 flex items-center gap-2 transition-all cursor-pointer border-none bg-none"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setActiveKebabId(null);
                              setDeleteTarget({ type: 'category', category: cat });
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-all cursor-pointer border-none bg-none"
                          >
                            <Trash2 size={11} /> Hapus
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* List of Sub-categories with Hover Action Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cat.subcategories.map((sub, idx) => {
                      const parentColor = cat.colorHex || cat.color_hex;
                      return (
                        <div 
                          key={idx}
                          className={`group/chip relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-default ${
                            parentColor ? '' : 'text-gray-600 bg-gray-50 border-gray-100 hover:bg-gray-100/70'
                          }`}
                          style={parentColor ? {
                            color: parentColor,
                            backgroundColor: `${parentColor}10`,
                            borderColor: `${parentColor}25`
                          } : undefined}
                        >
                          <LucideIcons.Folder size={12} style={parentColor ? { color: parentColor } : undefined} />
                          <span className={parentColor ? 'text-gray-700' : ''}>{sub}</span>
                          <div className="flex items-center gap-1.5 ml-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget({ category: cat, oldName: sub });
                              }}
                              className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Ubah Nama"
                            >
                              <Pencil size={10} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: 'subcategory', category: cat, subName: sub });
                              }}
                              className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                
                <button 
                  onClick={() => {
                    setFormData({ type: activeTab, parentCategory: cat.name, parentCategoryId: cat.id, subcategories: cat.subcategories, parentCategoryObject: cat, iconName: 'Folder' });
                    setCategoryToEdit(null);
                    setIsFormOpen(true);
                  }}
                  className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-lg self-start transition-colors cursor-pointer"
                >
                  + Tambah Sub-Kategori
                </button>
              </div>
            );
          })
          )}
        </div>
      )}

      {/* Form Modal for Master Data */}
      {isFormOpen && activeTab === 'rekening' && (
        <CreateMasterAccountModal
          onClose={() => {
            setIsFormOpen(false);
            setAccountToEdit(null);
          }}
          onSave={onSaveMasterData}
          accountToEdit={accountToEdit}
        />
      )}
      {isFormOpen && (activeTab === 'pengeluaran' || activeTab === 'pemasukan') && (
        <CreateMasterCategoryModal
          onClose={() => setIsFormOpen(false)}
          onSave={onSaveMasterData}
          initialType={activeTab}
          parentCategory={formData.parentCategory}
          parentCategoryId={formData.parentCategoryId}
          existingSubcategories={formData.subcategories}
          parentCategoryObject={formData.parentCategoryObject}
          categoryToEdit={categoryToEdit}
          allCategories={categories}
        />
      )}
      {isFormOpen && activeTab === 'periode' && (
        <CreateMasterPeriodModal
          onClose={() => {
            setIsFormOpen(false);
            setFormData({});
          }}
          onSave={onSaveMasterData}
          periodToEdit={formData.id ? formData : null}
          dbUser={dbUser}
          periods={periods}
        />
      )}
      {isFormOpen && activeTab !== 'rekening' && activeTab !== 'pengeluaran' && activeTab !== 'pemasukan' && activeTab !== 'periode' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-black text-gray-900">
                Tambah Master {
                  activeTab === 'aset' ? 'Aset' : 
                  activeTab === 'tag' ? 'Tag' : 
                  activeTab === 'kontak' ? 'Kontak' : 
                  formData.parentCategory ? 'Sub-Kategori' : 'Kategori'
                }
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                let collectionName = '';
                if (activeTab === 'aset') collectionName = 'assets';
                else if (activeTab === 'tag') collectionName = 'tags';
                else if (activeTab === 'kontak') collectionName = 'contacts';
                else collectionName = 'customCategories';
                
                try {
                  await onSaveMasterData(collectionName, formData, formData.id);
                  showToast('Data berhasil disimpan!', 'success');
                  setIsFormOpen(false);
                  setFormData({});
                } catch (error: any) {
                  showToast(error?.message || 'Gagal menyimpan data', 'error');
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-4">
                
                {activeTab === 'aset' && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Nama Aset</label>
                      <input required type="text" value={formData.assetName || ''} onChange={e => setFormData({...formData, assetName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Kategori Aset</label>
                      <select required value={formData.assetCategory || ''} onChange={e => setFormData({...formData, assetCategory: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3">
                        <option value="">Pilih...</option>
                        <option value="Gold">Emas</option>
                        <option value="Mutual Fund">Reksadana</option>
                        <option value="Stock">Saham</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Nilai Saat Ini</label>
                      <input required type="number" value={formData.currentValue || ''} onChange={e => setFormData({...formData, currentValue: Number(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                  </>
                )}

                {activeTab === 'tag' && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Nama Tag / Proyek</label>
                      <input required type="text" value={formData.tagName || ''} onChange={e => setFormData({...formData, tagName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Deskripsi (Opsional)</label>
                      <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                  </>
                )}

                {activeTab === 'kontak' && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Nama Kontak</label>
                      <input required type="text" value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-1 block">Tipe Kontak</label>
                      <select required value={formData.contactType || ''} onChange={e => setFormData({...formData, contactType: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3">
                        <option value="">Pilih...</option>
                        <option value="Payer">Pemberi Dana (Payer)</option>
                        <option value="Payee">Penerima Dana (Payee)</option>
                        <option value="Team Member">Anggota Tim</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                    Simpan Master Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

       {/* Delete Confirmation Modal Dialog */}
      {deleteTarget && (
        <DeleteConfirmationModal
          onClose={() => setDeleteTarget(null)}
          title={deleteTarget.type === 'category' ? 'Hapus Kategori Utama' : deleteTarget.type === 'account' ? 'Hapus Rekening' : 'Hapus Sub-Kategori'}
          message={
            deleteTarget.type === 'category' && deleteTarget.category
              ? `Apakah Anda yakin ingin menghapus kategori "${deleteTarget.category.name}"? Sistem akan mendeteksi transaksi terkait; jika ditemukan, kategori ini akan disembunyikan (soft-delete) untuk melindungi histori keuangan Anda.`
              : deleteTarget.type === 'account' && deleteTarget.account
              ? `Apakah Anda yakin ingin menghapus rekening "${deleteTarget.account.accountName}"? Jika terdapat transaksi terkait, rekening ini akan disembunyikan (soft-delete).`
              : deleteTarget.category ? `Apakah Anda yakin ingin menghapus sub-kategori "${deleteTarget.subName}" dari kategori "${deleteTarget.category.name}"? Jika terdapat transaksi yang menggunakannya, sub-kategori akan disembunyikan secara aman.` : ''
          }
          onConfirm={async () => {
            try {
              if (deleteTarget.type === 'category' && deleteTarget.category) {
                await handleDeleteCategory(deleteTarget.category);
                showToast(`Kategori "${deleteTarget.category.name}" berhasil dihapus!`, 'success');
              } else if (deleteTarget.type === 'subcategory' && deleteTarget.category && deleteTarget.subName) {
                await handleDeleteSubcategory(deleteTarget.category, deleteTarget.subName);
                showToast(`Sub-kategori "${deleteTarget.subName}" berhasil dihapus!`, 'success');
              } else if (deleteTarget.type === 'account' && deleteTarget.account) {
                const accountName = deleteTarget.account.accountName;
                showToast('Menghapus rekening...', 'info');
                
                // Fire and forget, the hook handles optimism
                onDeleteMasterData('accounts', String(deleteTarget.account.id));
                showToast(`Rekening "${accountName}" berhasil dihapus!`, 'success');
              }
            } catch (err: any) {
              const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal menghapus';
              showToast(errMsg, 'error');
              throw err;
            }
          }}
        />
      )}

      {/* Rename Subcategory Modal Dialog */}
      {renameTarget && (
        <RenameSubcategoryModal
          onClose={() => setRenameTarget(null)}
          oldName={renameTarget.oldName}
          onConfirm={async (newName) => {
            await handleRenameSubcategory(renameTarget.category, renameTarget.oldName, newName);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPeriod && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
              <LucideIcons.AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Periode?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus periode <strong className="text-gray-900">{deleteConfirmPeriod.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmPeriod(null)}
                disabled={deletingPeriodId !== null}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeletePeriodLogic(deleteConfirmPeriod)}
                disabled={deletingPeriodId !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingPeriodId !== null ? (
                  <>
                    <LucideIcons.Loader2 size={16} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
