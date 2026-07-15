import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const translateError = (message: string): string => {
  if (!message) return 'Terjadi kesalahan yang tidak diketahui.';
  
  const lower = message.toLowerCase();
  if (lower.includes('permission-denied') || lower.includes('insufficient permissions') || lower.includes('missing or insufficient permissions')) {
    return 'Akses ditolak: Anda tidak memiliki izin untuk menyimpan, menghapus, atau mengubah data ini.';
  }
  if (lower.includes('offline') || lower.includes('failed to get document from cache')) {
    return 'Koneksi gagal: Silakan periksa koneksi internet Anda atau coba lagi nanti.';
  }
  if (lower.includes('unauthenticated') || lower.includes('auth/')) {
    return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
  }
  if (lower.includes('quota exceeded') || lower.includes('resource exhausted')) {
    return 'Batas kuota terlampaui. Silakan coba beberapa saat lagi.';
  }
  if (lower.includes('already exists') || lower.includes('already-exists')) {
    return 'Data ini sudah ada dalam sistem.';
  }
  if (lower.includes('not-found') || lower.includes('not found')) {
    return 'Data yang dicari tidak ditemukan.';
  }
  if (lower.includes('disabled') || lower.includes('dinonaktifkan')) {
    return 'Fitur ini dinonaktifkan untuk akun Tamu.';
  }
  return message;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const finalMessage = type === 'error' ? translateError(message) : message;
    setToast({ message: finalMessage, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000); // 5 seconds duration
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed top-4 right-4 z-[9999] max-w-md w-[calc(100%-2rem)] sm:w-[380px] rounded-2xl shadow-2xl border p-4 font-sans flex items-start gap-3.5 transition-colors duration-300 ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
            id="global-toast-refactored"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <CheckCircle2 className="h-6 w-6 text-green-600 animate-pulse" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-6 w-6 text-red-600 animate-bounce" />
              )}
              {toast.type === 'info' && (
                <Info className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest opacity-80">
                {toast.type === 'success' ? 'Berhasil' : toast.type === 'error' ? 'Kesalahan' : 'Informasi'}
              </p>
              <p className="text-base font-bold mt-1 leading-snug whitespace-pre-line">
                {toast.message}
              </p>
            </div>
            <button
              onClick={hideToast}
              className={`shrink-0 p-1 rounded-lg transition-colors cursor-pointer ${
                toast.type === 'success'
                  ? 'text-green-400 hover:text-green-600 hover:bg-green-100/50'
                  : toast.type === 'error'
                  ? 'text-red-400 hover:text-red-600 hover:bg-red-100/50'
                  : 'text-blue-400 hover:text-blue-600 hover:bg-blue-100/50'
              }`}
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
