import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Calendar } from 'lucide-react';

const indonesianMonths: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, pebruari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agt: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11,
};

const englishMonths: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const monthMap: Record<string, number> = {
  ...indonesianMonths,
  ...englishMonths
};

const periodSchema = z.object({
  name: z.string().min(1, 'Nama periode wajib diisi'),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().min(1, 'Tanggal berakhir wajib diisi'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'Tanggal Berakhir tidak boleh lebih awal dari Tanggal Mulai',
  path: ['endDate'],
});

type PeriodFormValues = z.infer<typeof periodSchema>;

interface CreateMasterPeriodModalProps {
  onClose: () => void;
  onSave: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  periodToEdit?: { id?: string; name?: string; startDate?: string; endDate?: string } | null;
}

const formatToInputDate = (dateStr?: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    return dateStr.split('T')[0];
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const formatDateToDDMMYYYY = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function CreateMasterPeriodModal({
  onClose,
  onSave,
  periodToEdit
}: CreateMasterPeriodModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      name: periodToEdit?.name || '',
      startDate: formatToInputDate(periodToEdit?.startDate),
      endDate: formatToInputDate(periodToEdit?.endDate)
    }
  });

  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');

  const onSubmit = async (values: PeriodFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onSave('periods', values, periodToEdit?.id);
      setSuccessMessage('Periode berhasil disimpan!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan master data periode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (val: string) => {
    const trimmed = val.toLowerCase().trim();
    const match = trimmed.match(/([a-z]+)\s+(\d{4})/) || trimmed.match(/(\d{4})\s+([a-z]+)/);
    if (match) {
      let monthPart = '';
      let yearPart = '';
      if (isNaN(Number(match[1]))) {
        monthPart = match[1];
        yearPart = match[2];
      } else {
        yearPart = match[1];
        monthPart = match[2];
      }
      const monthIndex = monthMap[monthPart];
      const yearNum = parseInt(yearPart, 10);
      if (monthIndex !== undefined && !isNaN(yearNum)) {
        const startMonthStr = String(monthIndex + 1).padStart(2, '0');
        const startDateStr = `${yearNum}-${startMonthStr}-01`;
        const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
        const endDateStr = `${yearNum}-${startMonthStr}-${String(lastDay).padStart(2, '0')}`;
        
        setValue('startDate', startDateStr, { shouldValidate: true });
        setValue('endDate', endDateStr, { shouldValidate: true });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-900">
            {periodToEdit ? 'Ubah' : 'Tambah'} Master Periode
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 mb-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">Nama Periode Baru</label>
              <input 
                {...register('name', {
                  onChange: (e) => handleNameChange(e.target.value)
                })}
                type="text" 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Contoh: Maret 2026" 
              />
              {errors.name && (
                <p className="mt-1 text-xs font-bold text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">Tanggal Mulai</label>
              <div className="relative">
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold bg-white flex items-center justify-between min-h-[44px]">
                  <span className={startDateValue ? "text-slate-800" : "text-slate-400"}>
                    {startDateValue ? formatDateToDDMMYYYY(startDateValue) : "dd/mm/yyyy"}
                  </span>
                  <Calendar size={16} className="text-slate-400" />
                </div>
                <input 
                  {...register('startDate')}
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                />
              </div>
              {errors.startDate && (
                <p className="mt-1 text-xs font-bold text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">Tanggal Berakhir</label>
              <div className="relative">
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold bg-white flex items-center justify-between min-h-[44px]">
                  <span className={endDateValue ? "text-slate-800" : "text-slate-400"}>
                    {endDateValue ? formatDateToDDMMYYYY(endDateValue) : "dd/mm/yyyy"}
                  </span>
                  <Calendar size={16} className="text-slate-400" />
                </div>
                <input 
                  {...register('endDate')}
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                />
              </div>
              {errors.endDate && (
                <p className="mt-1 text-xs font-bold text-red-600">{errors.endDate.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors border border-gray-100 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
