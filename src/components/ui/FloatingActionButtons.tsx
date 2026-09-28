import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingActionButtonsProps {
  onAddTransaction: () => void;
}

export default function FloatingActionButtons({ onAddTransaction }: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-[92px] md:bottom-8 right-4 md:right-8 z-50">
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={onAddTransaction}
        className="h-13 w-13 lg:h-14 lg:w-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl lg:rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_30px_rgba(79,70,229,0.45)] transition-all cursor-pointer ring-4 ring-white/90"
        title="Catat Transaksi Baru (Ctrl+N)"
        aria-label="Catat Transaksi"
      >
        <Plus size={26} className="text-white" />
      </motion.button>
    </div>
  );
}


