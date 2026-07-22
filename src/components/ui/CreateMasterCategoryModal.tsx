import React, { useState } from 'react';
import { Plus, HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Category } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

const COMMON_ICONS = [
  'Folder', 'ShoppingBag', 'Utensils', 'Car', 'Receipt', 
  'HeartPulse', 'GraduationCap', 'Sparkles', 'Briefcase', 'TrendingUp', 
  'Coins', 'Monitor', 'Home', 'Plane', 'Coffee', 
  'Smartphone', 'Music', 'Book', 'Gift', 'Scissors'
];

export const SWATCH_COLORS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Gray', hex: '#6B7280' }
];

interface CreateMasterCategoryModalProps {
  onClose: () => void;
  onSave: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  onSuccess?: (newId: string | number, categoryName: string) => void;
  initialType?: 'pengeluaran' | 'pemasukan';
  parentCategory?: string | null;
  parentCategoryId?: string | null;
  existingSubcategories?: string[];
  parentCategoryObject?: Category | null;
  categoryToEdit?: Category | null;
  allCategories: Category[];
}

export default function CreateMasterCategoryModal({ 
  onClose, 
  onSave, 
  onSuccess, 
  initialType = 'pengeluaran', 
  parentCategory, 
  parentCategoryId, 
  existingSubcategories = [], 
  parentCategoryObject,
  categoryToEdit = null,
  allCategories
}: CreateMasterCategoryModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  // If editing, use existing properties
  const [formData, setFormData] = useState<any>(
    categoryToEdit 
      ? { 
          name: categoryToEdit.name, 
          type: categoryToEdit.type, 
          iconName: categoryToEdit.iconName || 'Folder', 
          parentCategory: null 
        }
      : { 
          type: initialType, 
          iconName: 'Folder', 
          parentCategory 
        }
  );
  
  const [selectedColor, setSelectedColor] = useState<string>(
    categoryToEdit?.colorHex || '#6366F1'
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const nameInput = formData.name?.trim();

    try {
      // 1. Perform FRONTEND Unique Validation (case-insensitive)
      if (formData.parentCategory) {
        // We are adding a subcategory to a parent.
        const parentObj = allCategories.find(c => c.name === formData.parentCategory && c.type === formData.type);
        const subNameLower = (nameInput || '').toLowerCase();
        if (parentObj && (parentObj.subcategories || []).some(s => (s || '').toLowerCase() === subNameLower)) {
          throw new Error(`Sub-kategori "${nameInput}" sudah ada di dalam kategori "${formData.parentCategory}"!`);
        }
      } else {
        // We are creating or editing a main category
        const catNameLower = (nameInput || '').toLowerCase();
        const duplicate = allCategories.some(c => 
          c.type === formData.type && 
          (c.name || '').toLowerCase() === catNameLower && 
          (!categoryToEdit || String(c.id) !== String(categoryToEdit.id))
        );
        if (duplicate) {
          throw new Error(`Kategori "${nameInput}" sudah ada untuk tipe ${formData.type}!`);
        }
      }

      let savedId: string | void;
      if (categoryToEdit) {
        // EDIT MODE: We are editing/updating an existing main category
        const isPredefined = isNaN(Number(categoryToEdit.id));
        if (isPredefined) {
          // Editing predefined category: Save as a custom category override in db
          const dataToSave = {
            name: nameInput,
            type: formData.type,
            iconName: formData.iconName || 'Folder',
            colorClass: categoryToEdit.colorClass || 'bg-indigo-50 text-indigo-600',
            colorHex: selectedColor,
            color_hex: selectedColor,
            parentCategory: null,
            subcategories: categoryToEdit.subcategories || [],
            isActive: true
          };
          savedId = await onSave('customCategories', dataToSave);
        } else {
          // Editing existing custom category: Send update with id
          const dataToSave = {
            name: nameInput,
            type: formData.type,
            iconName: formData.iconName || 'Folder',
            colorClass: categoryToEdit.colorClass || 'bg-indigo-50 text-indigo-600',
            colorHex: selectedColor,
            color_hex: selectedColor,
            parentCategory: null,
            subcategories: categoryToEdit.subcategories || [],
            isActive: true
          };
          savedId = await onSave('customCategories', dataToSave, String(categoryToEdit.id));
        }
      } else {
        // CREATE MODE:
        const isPredefined = isNaN(Number(parentCategoryId));
        if (parentCategory && parentCategoryId && parentCategoryObject && !isPredefined) {
          // Adding subcategory to an existing custom category
          const dataToSave = {
            ...parentCategoryObject,
            subcategories: [...existingSubcategories, nameInput]
          };
          // Remove id and userId to prevent db mismatches
          delete (dataToSave as any).id;
          delete (dataToSave as any).userId;
          savedId = await onSave('customCategories', dataToSave, parentCategoryId);
        } else {
          // Creating new category (or a subcategory that links to a predefined parent)
          const dataToSave = {
            name: nameInput,
            type: formData.type,
            iconName: formData.iconName || 'Folder',
            colorClass: 'bg-indigo-50 text-indigo-600',
            colorHex: selectedColor,
            color_hex: selectedColor,
            parentCategory: parentCategory || null,
            subcategories: []
          };
          savedId = await onSave('customCategories', dataToSave);
        }
      }
      
      if (categoryToEdit) {
        showToast(t('toast.success.update') || 'Kategori berhasil diubah.', 'success');
      } else if (formData.parentCategory) {
        showToast(t('toast.success.create') || 'Sub-kategori berhasil ditambahkan.', 'success');
      } else {
        showToast(t('toast.success.create') || 'Kategori berhasil ditambahkan.', 'success');
      }
      
      if (onSuccess && !categoryToEdit) {
        onSuccess(savedId || '', nameInput);
      }
      
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      const errMsg = error.message || 'Terjadi kesalahan';
      showToast(errMsg, 'error');
    }
  };

  return (
    <Modal onClose={onClose} zIndexClass="z-[60]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-900">
            {categoryToEdit ? t('master_data.edit_master_category') : (formData.parentCategory ? t('master_data.add_master_subcategory') : t('master_data.add_master_category'))}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div data-lenis-prevent="true" className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.master_data_type')}</label>
              <input disabled type="text" value={formData.type === 'pengeluaran' ? t('master_data.tab_expense_categories') : t('master_data.tab_income_categories')} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500" />
            </div>
            {formData.parentCategory && (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.parent_category')}</label>
                <input disabled type="text" value={formData.parentCategory} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500" />
              </div>
            )}
            
            {!formData.parentCategory && (
              <>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block font-sans">{t('master_data.select_icon')}</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {COMMON_ICONS.map(iconName => {
                      const IconComp = (LucideIcons as any)[iconName] || HelpCircle;
                      const isSelected = formData.iconName === iconName;
                      return (
                        <button
                          type="button"
                          key={iconName}
                          onClick={() => setFormData({...formData, iconName})}
                          className={`p-3 rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                            isSelected 
                              ? 'shadow-sm' 
                              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                          style={isSelected ? {
                            borderColor: selectedColor,
                            color: selectedColor,
                            backgroundColor: `${selectedColor}15`
                          } : undefined}
                        >
                          <IconComp size={24} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block font-sans">{t('master_data.select_color')}</label>
                  <div className="flex gap-3 overflow-x-auto pb-1.5 no-scrollbar">
                    {SWATCH_COLORS.map(color => {
                      const isSelected = selectedColor === color.hex;
                      return (
                        <button
                          type="button"
                          key={color.hex}
                          onClick={() => setSelectedColor(color.hex)}
                          className="relative h-8 w-8 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && (
                            <div 
                              className="absolute inset-0 rounded-full border-2 border-white animate-scale-up"
                              style={{ transform: 'scale(1.2)' }}
                            />
                          )}
                          {isSelected && (
                            <LucideIcons.Check size={14} className="text-white font-black" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">
                {formData.parentCategory ? t('master_data.subcategory_name') : t('master_data.category_name')}
              </label>
              <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <p className="text-xs text-amber-600 mt-2 font-medium">{t('master_data.note_custom_data')}</p>
            
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">{t('master_data.cancel_btn')}</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer">
                {isSubmitting ? (t('budgets.saving_loading') || 'Menyimpan...') : t('master_data.save_btn')}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  );
}
