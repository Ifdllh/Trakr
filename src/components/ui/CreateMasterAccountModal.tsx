import React, { useState } from 'react';
import { Plus, Wallet, Building, CreditCard, Landmark } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

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
  const [formData, setFormData] = useState<any>(accountToEdit || {
    color: '#4f46e5',
    includeInNetWorth: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);
    try {
      const payload = {
        accountName: formData.accountName,
        accountType: formData.accountType,
        accountNumber: formData.accountNumber,
        color: formData.color,
        icon: formData.icon || 'Wallet',
        balance: formData.balance,
        includeInNetWorth: formData.includeInNetWorth
      };
      const newId = await onSave('accounts', payload, accountToEdit?.id);
      setFormMessage({ type: 'success', text: 'Data berhasil disimpan!' });
      
      if (onSuccess && newId) {
        onSuccess(newId);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error: any) {
      setIsSubmitting(false);
      setFormMessage({ type: 'error', text: error.message || 'Terjadi kesalahan' });
      
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-900">
            {accountToEdit ? 'Edit Master Rekening' : 'Tambah Master Rekening'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {formMessage && (
            <div className={`p-3 mb-4 rounded-xl text-sm font-bold ${formMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {formMessage.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">Nama Rekening</label>
              <input required type="text" value={formData.accountName || ''} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">Tipe Rekening</label>
              <select required value={formData.accountType || ''} onChange={e => setFormData({...formData, accountType: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Pilih...</option>
                <option value="Cash">Cash / Uang Tunai</option>
                <option value="Bank">Bank</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Credit Card">Kartu Kredit</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">Nomor Rekening (Opsional)</label>
              <input type="text" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Contoh: 1234567890" />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1 block">Ikon Representasi</label>
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
              <label className="text-sm font-bold text-gray-700 mb-1 block">Warna Identifikasi</label>
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
              <label className="text-sm font-bold text-gray-700 mb-1 block">Saldo Awal</label>
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
                Hitung dalam Total Kekayaan
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">Batal</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer">
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
