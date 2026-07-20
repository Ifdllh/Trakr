import React, { useState, useEffect, useRef } from 'react';
import { User, Sliders, Database, Wrench, Shield, Bell, ArrowLeft, Loader2, Camera, Calendar, ChevronDown } from 'lucide-react';
import { getAuthEnv, getActiveAuth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { seed2026Data } from '@/lib/seed2026';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

const compressImage = (file: File, maxWidth = 200, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal mendapatkan context 2D dari canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface SettingsProps {
  user: any;
  dbUser?: any;
  onProfileUpdate?: (updatedData: any) => void;
  setActiveTab: (tab: any) => void;
}

export default function Settings({ user, dbUser, onProfileUpdate, setActiveTab }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const language = ((i18n.resolvedLanguage || i18n.language || 'en').startsWith('id') ? 'id' : 'en') as 'id' | 'en';
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'preferences' | 'data' | 'security' | 'notifications'>('profile');
  const [displayName, setDisplayName] = useState(dbUser?.displayName || user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [monthlyBudgetVal, setMonthlyBudgetVal] = useState('0');
  const [currency, setCurrency] = useState('IDR - Rupiah');
  const [financialStartDay, setFinancialStartDay] = useState<number>(dbUser?.financialStartDay || 1);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<string>(dbUser?.firstDayOfWeek || 'Senin');
  const [autoCreatePeriods, setAutoCreatePeriods] = useState<boolean>(dbUser?.autoCreatePeriods || false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(dbUser?.theme || 'light');
  const [privacyMode, setPrivacyMode] = useState<boolean>(dbUser?.privacyMode || false);
  const [defaultLandingPage, setDefaultLandingPage] = useState<'dashboard' | 'transactions' | 'budgets'>(dbUser?.defaultLandingPage || 'dashboard');
  const [photoURL, setPhotoURL] = useState(dbUser?.photoURL || user?.photoURL || '');

  const handleLanguageChange = async (selectedLang: 'id' | 'en') => {
    // 1. Optimistic Update: Immediately change language in i18n instance
    i18n.changeLanguage(selectedLang);
    
    // 2. Perform Firestore update in background with error handling
    try {
      await api.put('/user/profile', {
        financialStartDay: parseInt(financialStartDay.toString(), 10) || 1,
        firstDayOfWeek,
        autoCreatePeriods: !!autoCreatePeriods,
        theme,
        privacyMode,
        defaultLandingPage,
        language: selectedLang
      });
      
      if (onProfileUpdate) {
        onProfileUpdate({
          financialStartDay: parseInt(financialStartDay.toString(), 10) || 1,
          firstDayOfWeek,
          autoCreatePeriods: !!autoCreatePeriods,
          theme,
          privacyMode,
          defaultLandingPage,
          language: selectedLang
        });
      }
    } catch (err) {
      console.error('Failed to save language preference to Firestore:', err);
    }
  };
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, promise: toastPromise } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDayPopoverOpen, setIsDayPopoverOpen] = useState(false);
  const dayPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dayPopoverRef.current && !dayPopoverRef.current.contains(event.target as Node)) {
        setIsDayPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (dbUser?.displayName) {
      setDisplayName(dbUser.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
    if (dbUser?.photoURL) {
      setPhotoURL(dbUser.photoURL);
    } else if (user?.photoURL) {
      setPhotoURL(user.photoURL);
    }
    if (dbUser?.financialStartDay !== undefined) {
      setFinancialStartDay(dbUser.financialStartDay);
    }
    if (dbUser?.firstDayOfWeek !== undefined) {
      setFirstDayOfWeek(dbUser.firstDayOfWeek);
    }
    if (dbUser?.autoCreatePeriods !== undefined) {
      setAutoCreatePeriods(dbUser.autoCreatePeriods);
    }
    if (dbUser?.theme !== undefined) {
      setTheme(dbUser.theme);
    }
    if (dbUser?.language !== undefined) {
      i18n.changeLanguage(dbUser.language);
    }
    if (dbUser?.privacyMode !== undefined) {
      setPrivacyMode(dbUser.privacyMode);
    }
    if (dbUser?.defaultLandingPage !== undefined) {
      setDefaultLandingPage(dbUser.defaultLandingPage);
    }
  }, [user, dbUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/user/profile');
        const data = response.data;
        if (data) {
          if (data.displayName) setDisplayName(data.displayName);
          if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
          if (data.monthlyBudget !== undefined) setMonthlyBudgetVal(data.monthlyBudget.toString());
          if (data.currency) setCurrency(data.currency);
          if (data.financialStartDay !== undefined) setFinancialStartDay(data.financialStartDay);
          if (data.firstDayOfWeek !== undefined) setFirstDayOfWeek(data.firstDayOfWeek);
          if (data.autoCreatePeriods !== undefined) setAutoCreatePeriods(data.autoCreatePeriods);
          if (data.theme) setTheme(data.theme);
          if (data.language) {
            i18n.changeLanguage(data.language);
          }
          if (data.privacyMode !== undefined) setPrivacyMode(data.privacyMode);
          if (data.defaultLandingPage) setDefaultLandingPage(data.defaultLandingPage);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      } catch (err: any) {
        if (!err?.message?.includes('Quota') && !err?.message?.includes('429')) console.error('Failed to load user profile settings:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Guard file size
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('toast.error.file_too_large') || 'Ukuran file tidak boleh lebih dari 10MB sebelum kompresi', 'error');
      return;
    }

    const processUpload = async () => {
      // 1. Compress image to Base64 (max width 200px, quality 0.7)
      const base64String = await compressImage(file, 200, 0.7);

      // 2. Update Firestore via API
      await api.put('/user/profile', {
        photoURL: base64String
      });

      return base64String;
    };

    try {
      const base64String = await toastPromise(processUpload(), {
        loading: 'Sedang memproses foto...',
        success: 'Foto profil berhasil diperbarui!',
        error: (err) => err?.message || 'Gagal memperbarui foto profil'
      });
      
      // Update local state in Settings reactively
      setPhotoURL(base64String);
      
      // Update parent state in App.tsx
      if (onProfileUpdate) {
        onProfileUpdate({ photoURL: base64String });
      }
    } catch (err) {
      console.error('File process error:', err);
    }
  };

  const menuItems = [
    { id: 'profile', label: t('settings_sidebar.menu_profile') || 'Profil Pengguna', icon: User, desc: t('settings_sidebar.desc_profile') || 'Kelola informasi pribadi dan identitas akun.' },
    { id: 'preferences', label: t('settings_sidebar.menu_preferences') || 'Preferensi Aplikasi', icon: Sliders, desc: t('settings_sidebar.desc_preferences') || 'Kustomisasi tampilan, bahasa, dan opsi regional.' },
    { id: 'security', label: t('settings_sidebar.menu_security') || 'Keamanan', icon: Shield, desc: t('settings_sidebar.desc_security') || 'Sandi, sesi aktif, dan kontrol otentikasi.' },
    { id: 'notifications', label: t('settings_sidebar.menu_notifications') || 'Notifikasi', icon: Bell, desc: t('settings_sidebar.desc_notifications') || 'Atur frekuensi dan saluran pemberitahuan anggaran.' },
    { id: 'data', label: t('settings_sidebar.menu_data') || 'Data & Ekspor', icon: Database, desc: t('settings_sidebar.desc_data') || 'Cadangkan, ekspor data transaksi ke CSV/Excel, atau reset data.' },
  ] as const;

  const getInitials = (nameString?: string | null, emailString?: string | null) => {
    if (nameString && nameString.trim()) {
      const parts = nameString.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (emailString && emailString.trim()) {
      const namePart = emailString.split('@')[0];
      return namePart.substring(0, 2).toUpperCase();
    }
    return 'MI';
  };

  const initials = getInitials(displayName, user?.email);

  const formattedBudget = () => {
    const num = parseFloat(monthlyBudgetVal) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast(t('toast.error.empty_name') || 'Nama Lengkap tidak boleh kosong', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const activeAuth = getActiveAuth();
      if (activeAuth.currentUser) {
        await updateProfile(activeAuth.currentUser, {
          displayName: displayName.trim()
        });
        await activeAuth.currentUser.reload();
      }

      await api.put('/user/profile', {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        monthlyBudget: parseFloat(monthlyBudgetVal) || 0
      });

      showToast(t('toast.success.update') || 'Profil pengguna berhasil diperbarui!', 'success');
      
      // Update parent state reactively
      if (onProfileUpdate) {
        onProfileUpdate({
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          monthlyBudget: parseFloat(monthlyBudgetVal) || 0
        });
      }
    } catch (err: any) {
      showToast(err?.message || t('toast.error.general') || 'Gagal menyimpan perubahan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    try {
      await api.put('/user/profile', {
        financialStartDay: parseInt(financialStartDay.toString(), 10) || 1,
        firstDayOfWeek,
        autoCreatePeriods: !!autoCreatePeriods,
        theme,
        privacyMode,
        defaultLandingPage,
        language
      });

      showToast(t('toast_success'), 'success');
      
      // Update parent state reactively
      if (onProfileUpdate) {
        onProfileUpdate({
          financialStartDay: parseInt(financialStartDay.toString(), 10) || 1,
          firstDayOfWeek,
          autoCreatePeriods: !!autoCreatePeriods,
          theme,
          privacyMode,
          defaultLandingPage,
          language
        });
      }
    } catch (err: any) {
      showToast(err?.message || t('toast_error'), 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" id="settings-page-container">
      {/* Back button and page title wrapper */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200/60 bg-white cursor-pointer"
          title="Kembali ke Dasbor"
          id="settings-back-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800" id="settings-page-title">{t('settings_sidebar.title') || 'Pengaturan Sistem'}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-grid">
        {/* Sidebar Settings Navigation */}
        <div className="lg:col-span-4 space-y-2" id="settings-sidebar">
          <div className="bg-white p-4 border border-slate-100 shadow-xs rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 block mb-2">{t('settings_sidebar.categories') || 'KATEGORI PENGATURAN'}</span>
            {menuItems.map((item) => {
              const isActive = activeSubTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSubTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-4 border-indigo-600 pl-2'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                  }`}
                  id={`settings-tab-${item.id}`}
                >
                  <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="settings-main-content">
          {activeSubTab === 'profile' ? (
            <>
              {/* Card 1: Informasi Pribadi (Editable) */}
              <div className="bg-white p-6 md:p-8 border border-slate-100 shadow-sm rounded-xl" id="card-informasi-pribadi">
                <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-6 mb-6">
                  {/* Avatar with Camera Badge */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-indigo-50 overflow-hidden">
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt={displayName || 'Avatar'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md border border-white hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
                      title={t('settings_profile.upload_photo_tooltip') || "Unggah Foto Profil"}
                      id="avatar-upload-badge"
                    >
                      <Camera size={12} />
                    </button>
                  </div>

                  <div className="text-center sm:text-left space-y-1.5">
                    <h3 className="text-base font-bold text-slate-800">{t('settings_profile.personal_info')}</h3>
                    <p className="text-xs text-slate-500">{t('settings_profile.personal_info_desc')}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors cursor-pointer"
                        id="upload-photo-btn"
                      >
                        {t('settings_profile.upload_photo')}
                      </button>
                      <span className="text-[10px] text-slate-400">{t('settings_profile.photo_format')}</span>
                    </div>
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      id="avatar-file-input"
                    />
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {isLoadingProfile ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <Loader2 size={24} className="animate-spin text-indigo-600" />
                      <p className="text-xs text-slate-500">{t('settings_profile.loading')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Section 1: Data Diri */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">{t('settings_profile.full_name')}</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold transition-all"
                              placeholder={t('settings_profile.full_name_placeholder') || "Masukkan nama lengkap"}
                              id="profile-name-input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">{t('settings_profile.primary_email')}</label>
                            <div className="relative">
                              <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-400 font-semibold cursor-not-allowed"
                                id="profile-email-input"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Shield size={14} />
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{t('settings_profile.auth_locked_msg')}</p>
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600">{t('settings_profile.phone_number')}</label>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold transition-all"
                              placeholder={t('settings_profile.phone_placeholder') || "Contoh: 0812..."}
                              id="profile-phone-input"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          id="save-profile-btn"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              {t('settings_profile.saving')}
                            </>
                          ) : (
                            t('settings_profile.save_changes')
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {/* Card 2: Informasi Sistem (Read-Only) */}
              <div className="bg-slate-50/70 p-6 md:p-8 border border-slate-200/60 shadow-xs rounded-xl space-y-6" id="card-informasi-sistem">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('settings_profile.system_info')}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t('settings_profile.system_info_desc')}</p>
                </div>

                <div className="space-y-3.5" id="settings-user-debug">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">{t('settings_profile.user_id')}</span>
                    <span className="text-xs font-mono text-slate-700 truncate max-w-[200px] bg-white border border-slate-200/60 px-2 py-1 rounded shadow-3xs" title={user?.uid || 'Unknown'}>
                      {user?.uid || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">{t('settings_profile.auth_status')}</span>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {user?.isAnonymous ? t('settings_profile.guest_anon') : t('settings_profile.google_oauth')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">{t('settings_profile.active_db')}</span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                      getAuthEnv() === 'prd'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {getAuthEnv() === 'prd' ? t('settings_profile.prd_db') : t('settings_profile.dev_db')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-slate-500">{t('settings_profile.firebase_project_id')}</span>
                    <span className="text-xs font-mono text-slate-700 bg-white border border-slate-200/60 px-2 py-1 rounded shadow-3xs">
                      {getAuthEnv() === 'prd'
                        ? (import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID || t('settings_profile.unconfigured'))
                        : (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zippy-solution-c7c1c')}
                    </span>
                  </div>

                  {getAuthEnv() === 'dev' && (
                    <div className="pt-4 border-t border-slate-200/50 flex flex-col gap-3">
                      <span className="text-xs font-semibold text-slate-800">{t('settings_profile.dev_actions')}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await seed2026Data((msg) => showToast(msg, 'success'));
                        }}
                        className="text-xs w-full py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        {t('settings_profile.populate_data')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : activeSubTab === 'preferences' ? (
            <div className="bg-white p-6 md:p-8 border border-slate-100 shadow-sm rounded-xl" id="card-preferensi-aplikasi">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-base font-bold text-slate-800">{t('title')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('subtitle')}</p>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-6">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t('system_behavior')}</h4>
                  
                  {/* 1. Tanggal Mulai Anggaran */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100/50 pb-4">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('budget_start_day')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('budget_start_day_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0 relative" ref={dayPopoverRef}>
                      <button
                        type="button"
                        onClick={() => setIsDayPopoverOpen(!isDayPopoverOpen)}
                        className="border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 shadow-sm cursor-pointer flex items-center justify-between gap-2.5 min-w-[130px] transition-colors"
                        id="preferences-budget-reset-date-trigger"
                      >
                        <Calendar size={14} className="text-slate-400" />
                        <span>{t('budget_start_day_trigger', { day: financialStartDay })}</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDayPopoverOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDayPopoverOpen && (
                        <div className="absolute right-0 mt-2 z-30 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 w-[260px] max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                            {t('choose_start_day')}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                              const isActive = financialStartDay === day;
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    setFinancialStartDay(day);
                                    setIsDayPopoverOpen(false);
                                  }}
                                  className={`h-8 w-8 text-xs rounded-lg font-semibold flex items-center justify-center cursor-pointer transition-all ${
                                    isActive
                                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/15'
                                      : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-600'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Awal Hari dalam Seminggu */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100/50 pb-4">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('first_day_of_week')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('first_day_of_week_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/30">
                        <button
                          type="button"
                          onClick={() => setFirstDayOfWeek('Senin')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            firstDayOfWeek === 'Senin'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-first-day-senin"
                        >
                          {t('monday')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFirstDayOfWeek('Minggu')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            firstDayOfWeek === 'Minggu'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-first-day-minggu"
                        >
                          {t('sunday')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Buat Periode Otomatis */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('auto_create_periods')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('auto_create_periods_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setAutoCreatePeriods(!autoCreatePeriods)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          autoCreatePeriods ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                        id="pref-auto-create-periods-toggle"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            autoCreatePeriods ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tampilan & Lokalisasi */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-6 mt-6">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t('appearance_localization')}</h4>

                  {/* Tema Aplikasi */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100/50 pb-4">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('app_theme')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('app_theme_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/30">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-theme-light"
                        >
                          {t('theme_light')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-theme-dark"
                        >
                          {t('theme_dark')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('system')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            theme === 'system'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-theme-system"
                        >
                          {t('theme_system')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bahasa Aplikasi */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100/50 pb-4">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('app_language')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('app_language_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/30">
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('id')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            language === 'id'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-lang-id"
                        >
                          {t('lang_id')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('en')}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            language === 'en'
                              ? 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          id="pref-lang-en"
                        >
                          {t('lang_en')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Halaman Awal */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('start_page')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('start_page_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <select
                        value={defaultLandingPage}
                        onChange={(e) => setDefaultLandingPage(e.target.value as any)}
                        className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 shadow-sm cursor-pointer min-w-[200px]"
                        id="pref-default-landing-page"
                      >
                        <option value="dashboard">{t('landing_dashboard')}</option>
                        <option value="transactions">{t('landing_transactions')}</option>
                        <option value="budgets">{t('landing_budgets')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Privasi & Interaksi */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-6 mt-6">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t('privacy_interaction')}</h4>

                  {/* Mode Privasi */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                    <div className="space-y-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block">{t('privacy_mode')}</label>
                      <span className="text-[11px] text-slate-400 block leading-relaxed">
                        {t('privacy_mode_desc')}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setPrivacyMode(!privacyMode)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          privacyMode ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                        id="pref-privacy-mode-toggle"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            privacyMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingPreferences}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    id="save-preferences-btn"
                  >
                    {isSavingPreferences ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t('saving_preferences')}
                      </>
                    ) : (
                      t('save_preferences')
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white p-8 border border-slate-100 shadow-sm rounded-xl flex flex-col items-center justify-center min-h-[400px] text-center" id="settings-placeholder-content">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 border border-slate-200/50" id="settings-coming-soon-icon">
                <Wrench size={28} className="animate-pulse text-indigo-500" />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 mb-3">
                {t('settings_coming_soon.badge')}
              </span>
              
              <h3 className="text-base font-bold text-slate-800 tracking-tight" id="settings-coming-soon-title">
                {t('settings_coming_soon.title', { feature: menuItems.find(item => item.id === activeSubTab)?.label })}
              </h3>
              
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed" id="settings-coming-soon-description">
                {t('settings_coming_soon.desc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

