import React, { useState } from 'react';
import { User, Sliders, Database, Wrench, Shield, Bell, ArrowLeft } from 'lucide-react';
import { getAuthEnv } from '@/lib/firebase';

interface SettingsProps {
  user: any;
  setActiveTab: (tab: any) => void;
}

export default function Settings({ user, setActiveTab }: SettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'preferences' | 'data' | 'security' | 'notifications'>('profile');

  const menuItems = [
    { id: 'profile', label: 'Profil Pengguna', icon: User, desc: 'Kelola informasi pribadi dan identitas akun.' },
    { id: 'preferences', label: 'Preferensi Aplikasi', icon: Sliders, desc: 'Kustomisasi tampilan, bahasa, dan opsi regional.' },
    { id: 'security', label: 'Keamanan', icon: Shield, desc: 'Sandi, sesi aktif, dan kontrol otentikasi.' },
    { id: 'notifications', label: 'Notifikasi', icon: Bell, desc: 'Atur frekuensi dan saluran pemberitahuan anggaran.' },
    { id: 'data', label: 'Data & Ekspor', icon: Database, desc: 'Cadangkan, ekspor data transaksi ke CSV/Excel, atau reset data.' },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" id="settings-page-container">
      {/* Back button and page title wrapper */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200/60 bg-white"
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
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

          {/* Quick info card in sidebar */}
          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl" id="settings-info-card">
            <h4 className="text-xs font-bold text-slate-700">Asisten Trakr v1.2.0</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Sistem manajemen keuangan personal terintegrasi dengan enkripsi tingkat militer dan analitik cerdas.
            </p>
          </div>
        </div>

        {/* Main Content Area - Under Construction Placeholder */}
        <div className="lg:col-span-8 bg-white p-8 border border-slate-100 shadow-sm rounded-xl flex flex-col items-center justify-center min-h-[400px] text-center" id="settings-main-content">
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

          <div className="mt-8 border-t border-slate-100 pt-6 w-full max-w-md text-left space-y-4" id="settings-user-debug">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-[11px] text-slate-400">ID Pengguna</span>
              <span className="text-[11px] text-slate-600 font-mono truncate max-w-[200px]">{user?.uid || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-[11px] text-slate-400">Email Utama</span>
              <span className="text-[11px] text-slate-600 font-mono">{user?.email || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-[11px] text-slate-400">Status Autentikasi</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {user?.isAnonymous ? 'Tamu (Anonymous)' : 'Google OAuth'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-[11px] text-slate-400">Database Aktif</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                getAuthEnv() === 'prd'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {getAuthEnv() === 'prd' ? 'Production (PRD)' : 'Sandbox (DEV)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[11px] text-slate-400">Firebase Project ID</span>
              <span className="text-[11px] text-slate-600 font-mono">
                {getAuthEnv() === 'prd'
                  ? (import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID || 'Belum Terkonfigurasi')
                  : (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zippy-solution-c7c1c')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
