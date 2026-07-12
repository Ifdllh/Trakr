import React, { useState } from 'react';
import { 
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [error, setError] = useState<string | null>(null);
  const [restrictedError, setRestrictedError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setRestrictedError(false);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation')) {
        setRestrictedError(true);
        return;
      }
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup masuk diblokir oleh browser Anda. Mohon izinkan popup untuk situs ini.');
      } else if (err.code === 'auth/closed-by-user') {
        setError('Masuk dengan Google dibatalkan.');
      } else {
        setError('Gagal masuk menggunakan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          {restrictedError ? (
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

          <div className="flex flex-col items-center justify-center space-y-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                      <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                      <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                      <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                    </g>
                  </svg>
                  Masuk dengan Google
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Trakr.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
