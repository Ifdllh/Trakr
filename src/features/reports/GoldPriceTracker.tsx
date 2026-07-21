import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Info
} from 'lucide-react';

interface VendorData {
  name: string;
  buyPrice: number | null;
  sellPrice: number | null;
  date: string | null;
  isAvailable: boolean;
  type?: string;
  description?: string;
}

interface GoldPriceResponse {
  success: boolean;
  cached: boolean;
  lastUpdated: string;
  vendors: {
    [key: string]: VendorData;
  };
}

export default function GoldPriceTracker() {
  const { t } = useTranslation();
  const [data, setData] = useState<GoldPriceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendorKey, setSelectedVendorKey] = useState<string>('antam');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Calculator states
  const [goldGrams, setGoldGrams] = useState<number>(10);
  const [customBuyPrice, setCustomBuyPrice] = useState<string>('');
  const [customSellPrice, setCustomSellPrice] = useState<string>('');
  const [isFocusBuy, setIsFocusBuy] = useState<boolean>(false);
  const [isFocusSell, setIsFocusSell] = useState<boolean>(false);

  const fetchGoldPrices = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const response = await api.get<GoldPriceResponse>(`/reports/gold-price${isManual ? '?refresh=true' : ''}`);
      if (response.data && response.data.success) {
        setData(response.data);
        
        // Auto-select first available vendor
        const vendorKeys = Object.keys(response.data.vendors);
        if (vendorKeys.length > 0) {
          const currentIsAvailable = response.data.vendors[selectedVendorKey]?.isAvailable;
          if (!currentIsAvailable) {
            const firstAvailable = vendorKeys.find(key => response.data.vendors[key].isAvailable);
            if (firstAvailable) {
              setSelectedVendorKey(firstAvailable);
            } else {
              setSelectedVendorKey(vendorKeys[0]);
            }
          }
        }
      } else {
        throw new Error(t('dashboard.gold_tracker.err_invalid_data', 'Gagal memuat struktur data emas yang valid.'));
      }
    } catch (err: any) {

      setError(t('dashboard.gold_tracker.err_connect_fail', 'Gagal menghubungkan ke server harga emas. Silakan coba lagi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGoldPrices();
  }, []);

  const activeVendor = data?.vendors[selectedVendorKey];

  // Helper to get active prices (custom or live)
  const getBuyPrice = () => {
    if (customBuyPrice !== '') return Number(customBuyPrice);
    return activeVendor?.buyPrice || 1400000;
  };

  const getSellPrice = () => {
    if (customSellPrice !== '') return Number(customSellPrice);
    return activeVendor?.sellPrice || 1350000;
  };

  // Sync inputs with active vendor when active vendor changes
  useEffect(() => {
    if (activeVendor && activeVendor.buyPrice !== null) {
      setCustomBuyPrice('');
      setCustomSellPrice('');
    } else {
      setCustomBuyPrice('1430000');
      setCustomSellPrice('1320000');
    }
  }, [selectedVendorKey, activeVendor]);

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Humanize API Update Date
  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  const currentBuy = getBuyPrice();
  const currentSell = getSellPrice();
  const estimatedValue = goldGrams * currentSell;
  const spreadValue = goldGrams * (currentBuy - currentSell);

  const displayBuyValue = isFocusBuy 
    ? (customBuyPrice !== '' ? customBuyPrice : String(activeVendor?.buyPrice || 1400000))
    : formatIDR(Number(customBuyPrice !== '' ? customBuyPrice : (activeVendor?.buyPrice || 1400000)));

  const displaySellValue = isFocusSell 
    ? (customSellPrice !== '' ? customSellPrice : String(activeVendor?.sellPrice || 1350000))
    : formatIDR(Number(customSellPrice !== '' ? customSellPrice : (activeVendor?.sellPrice || 1350000)));

  return (
    <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6" id="gold-price-tracker-section">
      {/* Col 1: Live Prices Card */}
      <div className="md:col-span-6 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between min-h-[350px]">
        <div>
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{t('dashboard.gold_tracker.title', 'Pantauan Logam Mulia')}</h3>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">{t('dashboard.gold_tracker.title_desc', 'Harga emas 1 gram dari sumber resmi')}</p>
            </div>
            
            <button 
              onClick={() => fetchGoldPrices(true)}
              disabled={loading || refreshing}
              className="p-2 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
              title={t('dashboard.gold_tracker.update_price', 'Perbarui Harga')}
            >
              <RefreshCw size={14} className={refreshing || loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <span className="text-xs font-semibold text-slate-500">{t('dashboard.gold_tracker.connect_api', 'Menghubungkan ke API logam mulia...')}</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-start gap-2.5 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">{t('dashboard.gold_tracker.error_title', 'Terjadi Gangguan')}</p>
                <p>{error}</p>
                <button 
                  onClick={() => fetchGoldPrices(false)}
                  className="mt-2 text-[10px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-md transition-colors"
                >
                  {t('dashboard.gold_tracker.try_again', 'Coba Lagi')}
                </button>
              </div>
            </div>
          ) : data ? (
            <div data-lenis-prevent="true" className="flex flex-col gap-3 max-h-[385px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {Object.keys(data.vendors).map((key) => {
                const vendor = data.vendors[key];
                if (!vendor) return null;
                const isSelected = selectedVendorKey === key;
                
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedVendorKey(key)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-50/20 shadow-sm' 
                        : 'border-gray-100 hover:border-slate-300 hover:bg-slate-50 bg-white transition-colors cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                        isSelected 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'
                      }`}>
                        {vendor.name.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-slate-800">{vendor.name}</h4>
                          {vendor.type && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                              vendor.type === 'Digital'
                                ? 'bg-blue-50 text-blue-600'
                                : vendor.type === 'Sharia'
                                ? 'bg-teal-50 text-teal-600'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {vendor.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {vendor.buyPrice !== null ? (
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">{t('dashboard.gold_tracker.buy', 'BELI')}</span>
                          <span className="text-xs font-black text-slate-900 tabular-nums">
                            {formatIDR(vendor.buyPrice || 0)}
                          </span>
                        </div>
                        <div className="border-l border-gray-100 pl-3">
                          <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">{t('dashboard.gold_tracker.sell', 'JUAL (BUYBACK)')}</span>
                          <span className="text-xs font-black text-slate-700 tabular-nums">
                            {formatIDR(vendor.sellPrice || 0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-gray-100 text-slate-500 text-[9px] font-extrabold px-2.5 py-1 rounded-lg">
                        {t('dashboard.gold_tracker.pending_data', 'Data tertunda')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {data && !loading && !error && (
          <div className="border-t border-gray-50 pt-4 mt-4 flex items-center justify-between text-[9px] font-medium text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {t('dashboard.gold_tracker.last_updated', 'Terakhir Diperbarui:')} {formatLastUpdated(data.lastUpdated)}
            </span>
          </div>
        )}
      </div>

      {/* Col 2: Spread & Asset Simulator */}
      <div className="md:col-span-6 bg-white p-6 border border-slate-100 shadow-sm rounded-xl flex flex-col justify-start min-h-[350px]">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <Award size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{t('dashboard.gold_tracker.calc_title', 'Kalkulator Estimasi Sebaran')}</h3>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                {t('dashboard.gold_tracker.calc_desc', 'Simulasi nilai aset emas berdasarkan harga {{vendor}}', { vendor: activeVendor?.name || 'Antam' })}
              </p>
            </div>
            
            {/* Display active vendor tag */}
            <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {activeVendor?.name || 'Antam'}
            </span>
          </div>

          {/* Calculator Input Fields */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 focus-within:bg-white rounded-xl p-3 border border-transparent hover:border-slate-200 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
              <span className="text-[8px] uppercase font-extrabold text-slate-500 block mb-1 tracking-wider">{t('dashboard.gold_tracker.weight', 'GRAMASI (G)')}</span>
              <input 
                type="number" 
                min="0.01"
                step="0.01"
                value={goldGrams} 
                onChange={(e) => setGoldGrams(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
              />
            </div>
            <div className="bg-slate-50 focus-within:bg-white rounded-xl p-3 border border-transparent hover:border-slate-200 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all relative">
              <span className="text-[8px] uppercase font-extrabold text-slate-500 block mb-1 tracking-wider">{t('dashboard.gold_tracker.buy_per_g', 'BELI / G')}</span>
              <input 
                type={isFocusBuy ? "number" : "text"} 
                value={displayBuyValue}
                onFocus={() => setIsFocusBuy(true)}
                onBlur={() => setIsFocusBuy(false)}
                onChange={(e) => setCustomBuyPrice(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-emerald-600 outline-none"
                placeholder={formatIDR(activeVendor?.buyPrice || 1400000)}
              />
              {customBuyPrice !== '' && (
                <button 
                  onClick={() => setCustomBuyPrice('')}
                  className="absolute right-2 top-2 text-[8px] text-gray-400 hover:text-amber-500 font-bold px-1"
                >
                  {t('dashboard.gold_tracker.reset', 'Reset')}
                </button>
              )}
            </div>
            <div className="bg-slate-50 focus-within:bg-white rounded-xl p-3 border border-transparent hover:border-slate-200 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all relative">
              <span className="text-[8px] uppercase font-extrabold text-slate-500 block mb-1 tracking-wider">{t('dashboard.gold_tracker.sell_per_g', 'JUAL / G')}</span>
              <input 
                type={isFocusSell ? "number" : "text"} 
                value={displaySellValue}
                onFocus={() => setIsFocusSell(true)}
                onBlur={() => setIsFocusSell(false)}
                onChange={(e) => setCustomSellPrice(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-rose-500 outline-none"
                placeholder={formatIDR(activeVendor?.sellPrice || 1350000)}
              />
              {customSellPrice !== '' && (
                <button 
                  onClick={() => setCustomSellPrice('')}
                  className="absolute right-2 top-2 text-[8px] text-gray-400 hover:text-amber-500 font-bold px-1"
                >
                  {t('dashboard.gold_tracker.reset', 'Reset')}
                </button>
              )}
            </div>
          </div>

          {/* Calculator Output Displays */}
          <div className="flex flex-col gap-3.5 bg-slate-50/50 p-4 rounded-2xl border border-gray-100/70">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
                  {t('dashboard.gold_tracker.est_sell_value', 'ESTIMASI NILAI JUAL (BUYBACK)')}
                </span>
                <p className="text-lg font-black text-slate-900 tabular-nums tracking-tight">
                  {formatIDR(estimatedValue)}
                </p>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                <Sparkles size={18} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider block">{t('dashboard.gold_tracker.spread_cost', 'SPREAD (SELISIH BIAYA)')}</span>
                <p className="text-sm font-bold text-rose-600 tabular-nums">
                  -{formatIDR(spreadValue)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider block">{t('dashboard.gold_tracker.spread_percentage', 'PERSENTASE SELISIH')}</span>
                <p className="text-xs font-black text-rose-600 tabular-nums">
                  {currentBuy > 0 ? ((currentBuy - currentSell) / currentBuy * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between" id="calculator-bep-row">
              <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{t('dashboard.gold_tracker.bep_target', 'TARGET HARGA BALIK MODAL (BEP)')}</span>
              <span className="text-sm font-semibold text-slate-700 tabular-nums">
                {formatIDR(currentBuy)} / gr
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-2.5 items-start text-[10px] text-indigo-900 font-semibold leading-relaxed">
          <Info size={14} className="shrink-0 text-indigo-600 mt-0.5" />
          <p>
            {t('dashboard.gold_tracker.info_text', 'Nilai spread (selisih beli & jual) mencerminkan biaya transaksi investasi awal. Simpan logam mulia jangka panjang untuk mengompensasi spread ini.')}
          </p>
        </div>
      </div>
    </div>
  );
}
