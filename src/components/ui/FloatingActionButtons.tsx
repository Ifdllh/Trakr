import React from 'react';
import { Plus, Bot } from 'lucide-react';

interface FloatingActionButtonsProps {
  onAddTransaction: () => void;
  onOpenChat: () => void;
}

export default function FloatingActionButtons({ onAddTransaction, onOpenChat }: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-40 flex flex-col gap-4">
      <button
        onClick={onOpenChat}
        className="h-14 w-14 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-slate-900/20 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer relative group"
        title="Tanya AURA_CORE"
      >
        <Bot size={28} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
      </button>
      <button
        onClick={onAddTransaction}
        className="h-16 w-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 cursor-pointer"
        title="Catat Transaksi"
      >
        <Plus size={32} />
      </button>
    </div>
  );
}
