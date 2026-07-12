import React, { useState } from 'react';
import { Plus, HelpCircle, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const COMMON_ICONS = [
  'Folder', 'ShoppingBag', 'Utensils', 'Car', 'Receipt', 
  'HeartPulse', 'GraduationCap', 'Sparkles', 'Briefcase', 'TrendingUp', 
  'Coins', 'Monitor', 'Home', 'Plane', 'Coffee', 
  'Smartphone', 'Music', 'Book', 'Gift', 'Scissors'
];

interface CreateSubCategoryModalProps {
  onClose: () => void;
  onSave: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  onSuccess?: (newId: string | number, subCategoryName: string) => void;
  parentCategoryId: string | number;
  parentCategoryName: string;
  type: 'pengeluaran' | 'pemasukan';
}

export default function CreateSubCategoryModal({ 
  onClose, 
  onSave, 
  onSuccess, 
  parentCategoryId, 
  parentCategoryName, 
  type 
}: CreateSubCategoryModalProps) {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Folder');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormMessage({ type: 'error', text: 'Nama sub-kategori tidak boleh kosong' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const dataToSave = {
        name: name.trim(),
        type: type,
        iconName: iconName || 'Folder',
        colorClass: 'bg-indigo-50 text-indigo-600', // Default color class
        parentCategory: parentCategoryName, // Match existing parentCategory merge key
        parent_category_id: parentCategoryId, // Explicitly pass parent_category_id in payload as requested
        subcategories: []
      };
      
      const newId = await onSave('customCategories', dataToSave);
      setFormMessage({ type: 'success', text: 'Sub-kategori berhasil disimpan!' });
      
      if (onSuccess) {
        onSuccess(newId || name.trim(), name.trim());
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error: any) {
      setFormMessage({ type: 'error', text: error.message || 'Terjadi kesalahan' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 transform transition-all scale-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Tambah Sub-Kategori Baru
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Menambahkan sub-kategori kustom</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {formMessage && (
            <div className={`p-3 rounded-xl text-sm font-bold border ${
              formMessage.type === 'error' 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {formMessage.type === 'error' ? '❌' : '✅'} {formMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Visual Parent Lock */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Kategori Induk (Terkunci)
              </label>
              <div className="relative">
                <input 
                  disabled 
                  type="text" 
                  value={parentCategoryName} 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500 font-medium select-none cursor-not-allowed" 
                />
                <span className="absolute right-3 top-3.5 text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  Locked
                </span>
              </div>
            </div>

            {/* Type Information */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Tipe Transaksi
              </label>
              <input 
                disabled 
                type="text" 
                value={type === 'pengeluaran' ? '🔴 Pengeluaran' : '🟢 Pemasukan'} 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500 font-medium select-none cursor-not-allowed" 
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Pilih Ikon
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {COMMON_ICONS.map(name => {
                  const IconComp = (LucideIcons as any)[name] || HelpCircle;
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => setIconName(name)}
                      className={`p-3 rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                        iconName === name 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' 
                          : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600'
                      }`}
                    >
                      <IconComp size={20} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Category Name Input */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
                Nama Sub-Kategori Baru
              </label>
              <input 
                required 
                type="text" 
                placeholder="Contoh: McD, Starbucks, Bensin..." 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-800" 
              />
            </div>

            <p className="text-xs text-amber-600 mt-2 font-semibold bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
              💡 Catatan: Sub-kategori baru ini akan langsung ditambahkan ke kategori utama "{parentCategoryName}" dan terpilih secara otomatis.
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
