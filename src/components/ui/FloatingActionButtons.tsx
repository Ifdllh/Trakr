import { Plus } from 'lucide-react';

interface FloatingActionButtonsProps {
  onAddTransaction: () => void;
}

export default function FloatingActionButtons({ onAddTransaction }: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex flex-col gap-4">
      <button
        onClick={onAddTransaction}
        className="h-14 w-14 md:h-16 md:w-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        title="Catat Transaksi"
      >
        <Plus size={28} className="md:w-8 md:h-8" />
      </button>
    </div>
  );
}

