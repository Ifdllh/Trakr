import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

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
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Folder');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t('toast.error.empty_name') || 'Nama sub-kategori tidak boleh kosong', 'error');
      return;
    }

    setIsSubmitting(true);

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
      showToast(t('master_data.toast_master_add_success') || 'Sub-kategori berhasil ditambahkan.', 'success');
      
      if (onSuccess) {
        onSuccess(newId || name.trim(), name.trim());
      }
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      const errMsg = error.message || 'Terjadi kesalahan';
      showToast(errMsg, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 transform transition-all scale-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              {t('master_data.add_master_subcategory')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('master_data.add_custom_subcategory_desc')}</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Visual Parent Lock */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                {t('master_data.parent_category_locked')}
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
                {t('master_data.transaction_type')}
              </label>
              <input 
                disabled 
                type="text" 
                value={type === 'pengeluaran' ? '🔴 ' + t('master_data.tab_expense_categories').replace('💸 ', '') : '🟢 ' + t('master_data.tab_income_categories').replace('💰 ', '')} 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500 font-medium select-none cursor-not-allowed" 
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                {t('master_data.select_icon')}
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
                {t('master_data.subcategory_name')}
              </label>
              <input 
                required 
                type="text" 
                placeholder={t('master_data.subcategory_placeholder')} 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-800" 
              />
            </div>

            <p className="text-xs text-amber-600 mt-2 font-semibold bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
              {t('master_data.subcategory_note', { parent: parentCategoryName })}
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {t('master_data.cancel_btn')}
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : t('master_data.save_btn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
