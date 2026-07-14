import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { devAuth, prdAuth, googleProvider, setAuthEnv, getAuthEnv, getActiveAuth } from '@/lib/firebase';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [error, setError] = useState<string | null>(null);
  const [restrictedError, setRestrictedError] = useState(false);
  const [domainError, setDomainError] = useState(false);
  const [loading, setLoading] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const authToUse = getActiveAuth();
        const result = await getRedirectResult(authToUse);
        if (result) {
          onSuccess();
        }
      } catch (err: any) {

        if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
          setDomainError(true);
        } else {
          setError(`Gagal masuk: ${err.message || 'Error tidak diketahui'}`);
        }
      }
    };
    checkRedirect();
  }, [onSuccess]);

  const handleGoogleLogin = async (env: 'dev' | 'prd') => {
    setError(null);
    setRestrictedError(false);
    setDomainError(false);
    setLoading(true);
    
    setAuthEnv(env);
    
    let authToUse;
    try {
      authToUse = getActiveAuth();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return;
    }

    try {
      await signInWithPopup(authToUse, googleProvider);
      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setDomainError(true);
        setLoading(false);
        return;
      }
      if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation')) {
        setRestrictedError(true);
        setLoading(false);
        return;
      }

      if (err.code === 'auth/popup-blocked') {
        setError('Popup diblokir, mengalihkan halaman...');
        try {
          await signInWithRedirect(authToUse, googleProvider);
        } catch (redirectErr: any) {

          if (redirectErr.code === 'auth/unauthorized-domain' || redirectErr.message?.includes('unauthorized-domain')) {
            setDomainError(true);
          } else {
            setError(`Gagal mengalihkan halaman masuk: ${redirectErr.message || 'Error tidak diketahui'}`);
          }
          setLoading(false);
        }
      } else if (err.code === 'auth/closed-by-user' || err.code === 'auth/popup-closed-by-user') {
        setError('Masuk dengan Google dibatalkan.');
        setLoading(false);
      } else {
        setError(`Gagal masuk menggunakan Google (${env.toUpperCase()}).`);
        setLoading(false);
      }
    }
  };

  const hasPrdConfig = !!import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-sm w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <BrandLogo />
          <p className="mt-4 text-sm text-gray-600">
            Pencatatan keuangan pribadi yang rapi, aman, dan informatif
          </p>
        </div>

        {/* Card Container */}
        <motion.div 
          layout
          className="bg-white py-8 px-6 shadow-xl border border-gray-100 rounded-2xl"
        >
          
          {isIframe && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col gap-2 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-blue-900">Buka di Tab Baru</h3>
                  <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                    Login Google tidak dapat diselesaikan di dalam iframe AI Studio karena alasan keamanan browser. <strong>Silakan buka aplikasi ini di tab baru</strong> menggunakan tombol di pojok kanan atas AI Studio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {domainError ? (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-2 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-amber-900">Domain Belum Diizinkan</h3>
                  <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                    Sistem Firebase memblokir login dari domain ini karena belum didaftarkan.
                  </p>
                </div>
              </div>
              <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50 mt-1 text-[11px] text-slate-700 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-850">Cara Mengaktifkan di Firebase Console:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Firebase Console</a>.</li>
                  <li>Masuk ke menu <strong className="text-slate-800">Authentication</strong> &gt; <strong className="text-slate-800">Settings</strong>.</li>
                  <li>Di bawah tab <strong className="text-slate-800">Authorized domains</strong>, klik <strong className="text-indigo-600">Add domain</strong>.</li>
                  <li>Masukkan domain saat ini: <strong className="text-slate-800">{window.location.hostname}</strong></li>
                </ol>
              </div>
            </div>
          ) : restrictedError ? (

            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-2 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-amber-900">Pendaftaran Dibatasi</h3>
                  <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                    Sistem Firebase mencegah pendaftaran akun baru secara otomatis.
                  </p>
                </div>
              </div>
              
              <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50 mt-1 text-[11px] text-slate-700 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-850">Cara Mengaktifkan di Console Anda:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Firebase Console</a>.</li>
                  <li>Masuk ke menu <strong className="text-slate-800">Authentication</strong> &gt; <strong className="text-slate-800">Settings</strong>.</li>
                  <li>Di bawah tab <strong className="text-slate-800">User Actions</strong>, aktifkan opsi <strong className="text-indigo-600">"Enable create (sign up)"</strong>.</li>
                  <li>Buka tab <strong className="text-slate-800">Sign-in method</strong>, pastikan <strong className="text-indigo-600">Google</strong> sudah diaktifkan.</li>
                </ol>
              </div>
            </div>
          ) : error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg flex items-start gap-2.5">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-red-700 leading-normal font-medium">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {import.meta.env.PROD && !hasPrdConfig ? (
              <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-800 leading-relaxed shadow-sm">
                <p className="font-bold mb-1 text-red-900">Konfigurasi Vercel Belum Lengkap atau Membutuhkan Redeploy!</p>
                <p>Vercel tidak mendeteksi variabel <strong>VITE_PRD_FIREBASE_PROJECT_ID</strong> di dalam build. Karena alasan keamanan, akses ke Database Sandbox (Dev) telah diblokir di Production.</p>
                <div className="mt-3 bg-white/60 p-3 rounded-lg border border-red-100/50">
                  <p className="font-bold text-red-900 mb-1">Cara Memperbaiki:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-red-800">
                    <li>Buka Dashboard Vercel proyek Anda.</li>
                    <li>Masuk ke <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.</li>
                    <li>Pastikan Anda telah menambahkan <strong>semua</strong> variabel <code className="bg-red-100 px-1 py-0.5 rounded font-mono font-bold">VITE_PRD_FIREBASE_...</code> (seperti VITE_PRD_FIREBASE_PROJECT_ID, VITE_PRD_FIREBASE_API_KEY, dll) persis seperti di AI Studio.</li>
                    <li><strong>WAJIB:</strong> Buka tab <strong>Deployments</strong>, klik titik tiga (...) di deployment terakhir, dan pilih <strong>Redeploy</strong>.</li>
                  </ol>
                </div>
              </div>
            ) : hasPrdConfig && !import.meta.env.PROD ? (
              <>
                <div className="text-center mb-1">
                  <span className="text-xs font-medium text-slate-400">Pilih mode masuk:</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('dev')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google (Dev)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleLogin('prd')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google (PRD)
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleGoogleLogin(import.meta.env.PROD ? 'prd' : 'dev')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-800 transition-all disabled:opacity-50 cursor-pointer shadow-xs hover:shadow-sm"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Masuk dengan Google
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-slate-400 text-center leading-relaxed mt-2">
              Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Trakr.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
