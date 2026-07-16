import React, { useState, useEffect, useRef } from 'react';
import { User, Sliders, Database, Wrench, Shield, Bell, ArrowLeft, Loader2, Camera } from 'lucide-react';
import { getAuthEnv, getActiveAuth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { seed2026Data } from '@/lib/seed2026';

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
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'preferences' | 'data' | 'security' | 'notifications'>('profile');
  const [displayName, setDisplayName] = useState(dbUser?.displayName || user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [monthlyBudgetVal, setMonthlyBudgetVal] = useState('0');
  const [currency, setCurrency] = useState('IDR - Rupiah');
  const [financialStartDay, setFinancialStartDay] = useState<number>(1);
  const [photoURL, setPhotoURL] = useState(dbUser?.photoURL || user?.photoURL || '');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, promise: toastPromise } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      } catch (err: any) {
        console.error('Failed to load user profile settings:', err);
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
      showToast('Ukuran file tidak boleh lebih dari 10MB sebelum kompresi', 'error');
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
    { id: 'profile', label: 'Profil Pengguna', icon: User, desc: 'Kelola informasi pribadi dan identitas akun.' },
    { id: 'preferences', label: 'Preferensi Aplikasi', icon: Sliders, desc: 'Kustomisasi tampilan, bahasa, dan opsi regional.' },
    { id: 'security', label: 'Keamanan', icon: Shield, desc: 'Sandi, sesi aktif, dan kontrol otentikasi.' },
    { id: 'notifications', label: 'Notifikasi', icon: Bell, desc: 'Atur frekuensi dan saluran pemberitahuan anggaran.' },
    { id: 'data', label: 'Data & Ekspor', icon: Database, desc: 'Cadangkan, ekspor data transaksi ke CSV/Excel, atau reset data.' },
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
      showToast('Nama Lengkap tidak boleh kosong', 'error');
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

      showToast('Profil pengguna berhasil diperbarui!', 'success');
      
      // Update parent state reactively
      if (onProfileUpdate) {
        onProfileUpdate({
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          monthlyBudget: parseFloat(monthlyBudgetVal) || 0
        });
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan perubahan', 'error');
    } finally {
      setIsSaving(false);
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
          <h1 className="text-lg font-bold text-slate-800" id="settings-page-title">Pengaturan Sistem</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-grid">
        {/* Sidebar Settings Navigation */}
        <div className="lg:col-span-4 space-y-2" id="settings-sidebar">
          <div className="bg-white p-4 border border-slate-100 shadow-xs rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 block mb-2">Kategori Pengaturan</span>
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
                      title="Unggah Foto Profil"
                      id="avatar-upload-badge"
                    >
                      <Camera size={12} />
                    </button>
                  </div>

                  <div className="text-center sm:text-left space-y-1.5">
                    <h3 className="text-base font-bold text-slate-800">Informasi Pribadi</h3>
                    <p className="text-xs text-slate-500">Kelola identitas utama dan informasi profil Anda.</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors cursor-pointer"
                        id="upload-photo-btn"
                      >
                        Unggah Foto Baru
                      </button>
                      <span className="text-[10px] text-slate-400">PNG, JPG, atau WEBP</span>
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
                      <p className="text-xs text-slate-500">Memuat data profil...</p>
                    </div>
                  ) : (
                    <>
                      {/* Section 1: Data Diri */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Nama Lengkap</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold transition-all"
                              placeholder="Masukkan nama lengkap"
                              id="profile-name-input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Email Utama</label>
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
                            <p className="text-[10px] text-slate-400 mt-1">Sistem otentikasi dikunci menggunakan penyedia Google OAuth.</p>
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600">Nomor Telepon</label>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold transition-all"
                              placeholder="Contoh: 0812..."
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
                              Menyimpan...
                            </>
                          ) : (
                            'Simpan Perubahan'
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
                  <h3 className="text-sm font-bold text-slate-800">Informasi Sistem</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Detail identitas teknis dan parameter database Firebase.</p>
                </div>

                <div className="space-y-3.5" id="settings-user-debug">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">ID Pengguna</span>
                    <span className="text-xs font-mono text-slate-700 truncate max-w-[200px] bg-white border border-slate-200/60 px-2 py-1 rounded shadow-3xs" title={user?.uid || 'Unknown'}>
                      {user?.uid || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">Status Autentikasi</span>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {user?.isAnonymous ? 'Tamu (Anonymous)' : 'Google OAuth'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-500">Database Aktif</span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                      getAuthEnv() === 'prd'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {getAuthEnv() === 'prd' ? 'Production (PRD) - Firestore' : 'Sandbox (DEV) - Firestore'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Firebase Project ID</span>
                    <span className="text-xs font-mono text-slate-700 bg-white border border-slate-200/60 px-2 py-1 rounded shadow-3xs">
                      {getAuthEnv() === 'prd'
                        ? (import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID || 'Belum Terkonfigurasi')
                        : (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zippy-solution-c7c1c')}
                    </span>
                  </div>

                  {getAuthEnv() === 'dev' && (
                    <div className="pt-4 border-t border-slate-200/50 flex flex-col gap-3">
                      <span className="text-xs font-semibold text-slate-800">Developer Actions</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await seed2026Data((msg) => showToast(msg, 'success'));
                        }}
                        className="text-xs w-full py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        Populate Data 2026
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 border border-slate-100 shadow-sm rounded-xl flex flex-col items-center justify-center min-h-[400px] text-center" id="settings-placeholder-content">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 border border-slate-200/50" id="settings-coming-soon-icon">
                <Wrench size={28} className="animate-pulse text-indigo-500" />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 mb-3">
                Sedang Dikembangkan
              </span>
              
              <h3 className="text-base font-bold text-slate-800 tracking-tight" id="settings-coming-soon-title">
                Fitur {menuItems.find(item => item.id === activeSubTab)?.label}
              </h3>
              
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed" id="settings-coming-soon-description">
                Halaman Pengaturan sedang dalam tahap pengembangan. Kami sedang membangun kontrol privasi dan kustomisasi terbaik untuk akun Anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

