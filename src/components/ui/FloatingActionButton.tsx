import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  title?: string;
}

export default function FloatingActionButton({ onClick, title = "Catat Transaksi (Ctrl + N)" }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-50">
      <button
        onClick={onClick}
        className="h-16 w-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 cursor-pointer"
        title={title}
      >
        <Plus size={32} />
      </button>
    </div>
  );
}
