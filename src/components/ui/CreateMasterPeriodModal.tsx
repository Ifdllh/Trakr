import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

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
  dbUser?: any;
  periods?: any[];
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
  periodToEdit,
  dbUser,
  periods = []
}: CreateMasterPeriodModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      name: periodToEdit?.name || '',
      startDate: formatToInputDate(periodToEdit?.startDate),
      endDate: formatToInputDate(periodToEdit?.endDate)
    }
  });

  const typedName = watch('name');
  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');

  // Duplicate Check Validation
  const isDuplicateName = periods?.some(
    p => p.name.trim().toLowerCase() === typedName?.trim().toLowerCase() && p.id !== periodToEdit?.id
  );

  const isSaveDisabled = isSubmitting || isDuplicateName || !startDateValue || !endDateValue;

  const onSubmit = async (values: PeriodFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave('periods', { ...values, isActive: true }, periodToEdit?.id);
      showToast(t('master_data.toast_save_success') || 'Periode berhasil disimpan.', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || t('master_data.toast_save_fail') || 'Gagal menyimpan master data periode.', 'error');
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
        // Fetch financialStartDay D
        const D = dbUser?.financialStartDay !== undefined ? parseInt(dbUser.financialStartDay, 10) || 1 : 1;

        let startDate: Date;
        let endDate: Date;

        if (D === 1) {
          startDate = new Date(yearNum, monthIndex, 1);
          endDate = new Date(yearNum, monthIndex + 1, 0);
        } else {
          // If D > 1:
          // Start Date = D of the PREVIOUS month of the parsed month.
          // End Date = D - 1 of the TARGET (parsed) month.
          startDate = new Date(yearNum, monthIndex - 1, D);
          endDate = new Date(yearNum, monthIndex, D - 1);
        }

        const formatDateToYYYYMMDD = (d: Date): string => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const startDateStr = formatDateToYYYYMMDD(startDate);
        const endDateStr = formatDateToYYYYMMDD(endDate);

        setValue('startDate', startDateStr, { shouldValidate: true });
        setValue('endDate', endDateStr, { shouldValidate: true });
      } else {
        setValue('startDate', '');
        setValue('endDate', '');
      }
    } else {
      setValue('startDate', '');
      setValue('endDate', '');
    }
  };

  return (
    <Modal onClose={onClose} zIndexClass="z-50">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-black text-gray-900">
            {periodToEdit ? t('master_data.edit_master_period') : t('master_data.add_master_period')}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:bg-gray-200 p-2 rounded-full cursor-pointer transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div data-lenis-prevent="true" className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">{t('master_data.new_period_name')}</label>
              <input 
                {...register('name', {
                  onChange: (e) => handleNameChange(e.target.value)
                })}
                type="text" 
                className={`w-full border rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDuplicateName ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder={t('master_data.example_period') || 'Contoh: Maret 2026'} 
              />
              {isDuplicateName && (
                <p className="mt-1 text-xs font-bold text-red-600">{t('master_data.duplicate_period_warning')}</p>
              )}
              {errors.name && !isDuplicateName && (
                <p className="mt-1 text-xs font-bold text-red-600">
                  {errors.name.message === 'Nama periode wajib diisi' ? t('master_data.validation_period_name_required') : errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">{t('master_data.start_date')}</label>
              <div className="relative">
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold bg-gray-50 text-gray-500 cursor-not-allowed flex items-center justify-between min-h-[44px]">
                  <span>
                    {startDateValue ? formatDateToDDMMYYYY(startDateValue) : "dd/mm/yyyy"}
                  </span>
                </div>
                <input 
                  {...register('startDate')}
                  type="date" 
                  readOnly
                  className="absolute inset-0 opacity-0 pointer-events-none w-full h-full" 
                />
              </div>
              {errors.startDate && (
                <p className="mt-1 text-xs font-bold text-red-600">
                  {errors.startDate.message === 'Tanggal mulai wajib diisi' ? t('master_data.validation_start_date_required') : errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase mb-1.5 block">{t('master_data.end_date')}</label>
              <div className="relative">
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold bg-gray-50 text-gray-500 cursor-not-allowed flex items-center justify-between min-h-[44px]">
                  <span>
                    {endDateValue ? formatDateToDDMMYYYY(endDateValue) : "dd/mm/yyyy"}
                  </span>
                </div>
                <input 
                  {...register('endDate')}
                  type="date" 
                  readOnly
                  className="absolute inset-0 opacity-0 pointer-events-none w-full h-full" 
                />
              </div>
              {errors.endDate && (
                <p className="mt-1 text-xs font-bold text-red-600">
                  {errors.endDate.message === 'Tanggal berakhir wajib diisi' ? t('master_data.validation_end_date_required') : errors.endDate.message === 'Tanggal Berakhir tidak boleh lebih awal dari Tanggal Mulai' ? t('master_data.validation_end_date_before_start') : errors.endDate.message}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors border border-gray-100 cursor-pointer"
              >
                {t('master_data.cancel_btn')}
              </button>
              <button 
                type="submit" 
                disabled={isSaveDisabled} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (t('budgets.saving_loading') || 'Menyimpan...') : t('master_data.save_btn')}
              </button>
            </div>
          </form>
        </div>
    </Modal>
  );
}
