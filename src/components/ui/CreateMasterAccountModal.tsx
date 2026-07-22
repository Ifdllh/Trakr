import React, { useState } from 'react';
import { Plus, Wallet, Building, CreditCard, Landmark } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

interface CreateMasterAccountModalProps {
  onClose: () => void;
  onSave: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  onSuccess?: (newId: string | number) => void;
  accountToEdit?: any;
}

const PREDEFINED_COLORS = [
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#0ea5e9', // Light Blue
  '#0d9488', // Teal
  '#16a34a', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#db2777', // Pink
  '#9333ea', // Purple
  '#475569', // Slate
  '#000000', // Black
];

export default function CreateMasterAccountModal({ onClose, onSave, onSuccess, accountToEdit }: CreateMasterAccountModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(accountToEdit || {
    color: '#4f46e5',
    includeInNetWorth: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Full Object Payload
    const fullPayload = {
      accountName: formData.accountName,
      accountType: formData.accountType,
      accountNumber: formData.accountNumber,
      color: formData.color,
      icon: formData.icon || 'Wallet',
      balance: formData.balance,
      includeInNetWorth: formData.includeInNetWorth
    };

    // 1. Dirty State Checking (Partial Update)
    let payloadToSubmit: any = fullPayload;
    if (accountToEdit) {
      payloadToSubmit = {};
      Object.keys(fullPayload).forEach((key) => {
        if (fullPayload[key as keyof typeof fullPayload] !== accountToEdit[key]) {
          payloadToSubmit[key] = fullPayload[key as keyof typeof fullPayload];
        }
      });
      // Return early if no changes
      if (Object.keys(payloadToSubmit).length === 0) {
        onClose();
        return;
      }
    }

    // 2. Immediately close the Edit Modal after briefly showing loading state
    setTimeout(() => {
      onClose();
    }, 150);

    // 3. Show a non-blocking Toast notification
    showToast(t('budgets.saving_loading') || 'Menyimpan...', 'info');

    // 4. Send the API request asynchronously through onSave
    (async () => {
      try {
        const newId = await onSave('accounts', payloadToSubmit, accountToEdit?.id);
        if (onSuccess && newId) onSuccess(newId);
        showToast(t('master_data.toast_save_success') || (accountToEdit ? 'Rekening berhasil diubah.' : 'Rekening berhasil ditambahkan.'), 'success');
      } catch (error: any) {
        showToast(t('master_data.toast_save_fail') || 'Gagal menyimpan, mengembalikan data', 'error');
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <Modal onClose={onClose} zIndexClass="z-[60]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-900">
            {accountToEdit ? t('master_data.edit_master_account') : t('master_data.add_master_account')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div data-lenis-prevent="true" className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.account_name')}</label>
              <input required type="text" value={formData.accountName || ''} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.account_type')}</label>
              <select required value={formData.accountType || ''} onChange={e => setFormData({...formData, accountType: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">{t('master_data.select_placeholder')}</option>
                <option value="Cash">{t('master_data.account_type_cash')}</option>
                <option value="Bank">Bank</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Credit Card">{t('master_data.account_type_cc')}</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.account_number_optional')}</label>
              <input type="text" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('master_data.example_account_number') || "Contoh: 1234567890"} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.representation_icon')}</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { id: 'Wallet', icon: Wallet },
                  { id: 'Building', icon: Building },
                  { id: 'CreditCard', icon: CreditCard },
                  { id: 'Landmark', icon: Landmark }
                ].map(({ id, icon: IconComponent }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({...formData, icon: id})}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-all ${
                      (formData.icon || 'Wallet') === id 
                        ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500 shadow-sm scale-105' 
                        : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent size={24} />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.identification_color')}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PREDEFINED_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">{t('master_data.initial_balance')}</label>
              <NumericFormat
                required
                value={formData.balance || ''}
                onValueChange={(values) => {
                  setFormData({...formData, balance: values.floatValue || 0});
                }}
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Rp 0"
              />
            </div>

            <div className="flex items-center gap-3 py-2">
              <div 
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${formData.includeInNetWorth ? 'bg-indigo-600' : 'bg-gray-300'}`}
                onClick={() => setFormData({...formData, includeInNetWorth: !formData.includeInNetWorth})}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.includeInNetWorth ? 'translate-x-6' : ''}`} />
              </div>
              <label className="text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => setFormData({...formData, includeInNetWorth: !formData.includeInNetWorth})}>
                {t('master_data.include_in_net_worth')}
              </label>
            </div>

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
