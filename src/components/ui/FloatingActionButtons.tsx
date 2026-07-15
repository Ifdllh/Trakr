import { Plus } from 'lucide-react';

interface FloatingActionButtonsProps {
  onAddTransaction: () => void;
}

export default function FloatingActionButtons({ onAddTransaction }: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-40 flex flex-col gap-4">
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
