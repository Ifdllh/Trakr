import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, ChevronLeft, ChevronRight, ChevronDown, Check, 
  CalendarRange, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PeriodPickerProps {
  periods?: any[];
  selectedPeriod?: any;
  selectedMonth: number; // 1 - 12
  selectedYear: number;
  onSelectPeriod: (period: any) => void;
  onSelectMonthYear?: (month: number, year: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isCurrentMonth?: boolean;
  className?: string;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const translatePeriodName = (name: string, lang: string) => {
  if (!name) return '';
  if (lang !== 'en') return name;
  const monthMap: Record<string, string> = {
    'Januari': 'January', 'Februari': 'February', 'Maret': 'March',
    'April': 'April', 'Mei': 'May', 'Juni': 'June',
    'Juli': 'July', 'Agustus': 'August', 'September': 'September',
    'Oktober': 'October', 'November': 'November', 'Desember': 'December'
  };
  let result = name;
  Object.keys(monthMap).forEach((idMonth) => {
    result = result.replace(new RegExp(idMonth, 'g'), monthMap[idMonth]);
  });
  return result;
};

export const PeriodPicker: React.FC<PeriodPickerProps> = ({
  periods = [],
  selectedPeriod,
  selectedMonth,
  selectedYear,
  onSelectPeriod,
  onSelectMonthYear,
  onPrevMonth,
  onNextMonth,
  isCurrentMonth = false,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'periods' | 'custom'>('periods');
  const [pickerYear, setPickerYear] = useState(selectedYear);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEn = i18n.language === 'en';
  const monthNames = isEn ? MONTH_NAMES_EN : MONTH_NAMES_ID;
  const monthShortNames = isEn ? MONTH_SHORT_EN : MONTH_SHORT_ID;

  const currentDate = new Date();
  const currentActualMonth = currentDate.getMonth() + 1;
  const currentActualYear = currentDate.getFullYear();

  useEffect(() => {
    setPickerYear(selectedYear);
  }, [selectedYear]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format label for button trigger
  const triggerLabel = React.useMemo(() => {
    if (selectedPeriod && selectedPeriod.name) {
      return translatePeriodName(selectedPeriod.name, i18n.language);
    }
    const mName = monthNames[selectedMonth - 1] || (isEn ? `Month ${selectedMonth}` : `Bulan ${selectedMonth}`);
    return `${mName} ${selectedYear}`;
  }, [selectedPeriod, selectedMonth, selectedYear, i18n.language, monthNames, isEn]);

  // Get active period date range text if available
  const dateRangeSubtitle = React.useMemo(() => {
    if (selectedPeriod && selectedPeriod.startDate && selectedPeriod.endDate) {
      const formatShort = (dateStr: string) => {
        try {
          const d = new Date(dateStr);
          return d.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
            day: 'numeric',
            month: 'short'
          });
        } catch {
          return dateStr;
        }
      };
      return `${formatShort(selectedPeriod.startDate)} - ${formatShort(selectedPeriod.endDate)}`;
    }
    return null;
  }, [selectedPeriod, isEn]);

  const activePeriods = React.useMemo(() => {
    return (periods || []).filter((p: any) => p.isActive !== false);
  }, [periods]);

  const handleSelectPeriodItem = (p: any) => {
    onSelectPeriod(p);
    setIsOpen(false);
  };

  const handleSelectCustomMonth = (monthIndex: number) => {
    if (onSelectMonthYear) {
      onSelectMonthYear(monthIndex + 1, pickerYear);
    }
    setIsOpen(false);
  };

  const handleJumpToCurrentMonth = () => {
    if (activePeriods.length > 0) {
      const now = new Date();
      const targetMonthStr = String(now.getMonth() + 1).padStart(2, '0');
      const targetPrefix = `${now.getFullYear()}-${targetMonthStr}`;
      
      const currentP = activePeriods.find((p: any) => {
        if (p.startDate && p.startDate.startsWith(targetPrefix)) return true;
        return false;
      }) || activePeriods[0];

      if (currentP) {
        onSelectPeriod(currentP);
        setIsOpen(false);
        return;
      }
    }

    if (onSelectMonthYear) {
      onSelectMonthYear(currentActualMonth, currentActualYear);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Main Control Bar */}
      <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-xs transition-all hover:border-slate-300">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous Month"
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer active:scale-95"
          title={t('dashboard.prev_month', 'Bulan Sebelumnya')}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-indigo-50/60 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60 group-hover:scale-105 transition-transform">
            <Calendar size={14} className="stroke-[2.5]" />
          </div>

          <div className="text-left flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 tracking-tight whitespace-nowrap group-hover:text-indigo-600 transition-colors">
                {triggerLabel}
              </span>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-indigo-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>
            {dateRangeSubtitle && (
              <span className="text-[10px] font-medium text-slate-400 tracking-tight -mt-0.5">
                {dateRangeSubtitle}
              </span>
            )}
          </div>

          {isCurrentMonth && (
            <span className="ml-0.5 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg font-bold border border-emerald-200/60 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('dashboard.month_this', 'Bulan Ini')}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next Month"
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer active:scale-95"
          title={t('dashboard.next_month', 'Bulan Berikutnya')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl p-3 z-50 origin-top-right overflow-hidden"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarRange size={16} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t('dashboard.select_period', 'Pilih Periode Transaksi')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleJumpToCurrentMonth}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Clock size={12} />
                {t('dashboard.month_this', 'Bulan Ini')}
              </button>
            </div>

            {/* Mode Tabs (If master periods exist) */}
            {activePeriods.length > 0 && (
              <div className="flex bg-slate-100/80 p-1 rounded-xl mb-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('periods')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                    activeTab === 'periods'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('dashboard.tab_registered_periods', 'Periode Terdaftar')} ({activePeriods.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                    activeTab === 'custom'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('dashboard.tab_month_year', 'Bulan & Tahun')}
                </button>
              </div>
            )}

            {/* Content: Periods List */}
            {(activeTab === 'periods' && activePeriods.length > 0) ? (
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {activePeriods.map((p: any) => {
                  const isSelected = selectedPeriod && String(selectedPeriod.id) === String(p.id);
                  const pLabel = translatePeriodName(p.name, i18n.language);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPeriodItem(p)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {pLabel}
                          </span>
                          {p.isClosed && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
                              {t('dashboard.period_closed', isEn ? 'Closed' : 'Tutup Buku')}
                            </span>
                          )}
                        </div>
                        {p.startDate && p.endDate && (
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            {p.startDate} {isEn ? 'to' : 's/d'} {p.endDate}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-2">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Content: Month & Year Matrix Grid */
              <div className="space-y-3">
                {/* Year Controller */}
                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <span className="text-xs font-bold text-slate-500">{t('dashboard.year_label', isEn ? 'Year:' : 'Tahun:')}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerYear(prev => prev - 1)}
                      className="p-1 hover:bg-slate-200/70 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 font-mono">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(prev => prev + 1)}
                      className="p-1 hover:bg-slate-200/70 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {monthShortNames.map((mShort, idx) => {
                    const mNum = idx + 1;
                    const isSelected = !selectedPeriod && selectedMonth === mNum && selectedYear === pickerYear;
                    const isActual = currentActualMonth === mNum && currentActualYear === pickerYear;

                    return (
                      <button
                        key={mShort}
                        type="button"
                        onClick={() => handleSelectCustomMonth(idx)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'hover:bg-slate-100 text-slate-700 border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {mShort}
                        {isActual && !isSelected && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeriodPicker;
