import React from 'react';
import { 
  LayoutDashboard, History, BookOpen, Target, 
  PiggyBank 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings') => void;
  onAddTransaction: () => void;
}

export default function BottomNav({ activeTab, setActiveTab, onAddTransaction }: BottomNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'transactions', label: t('nav_transactions', 'Transaksi'), icon: History },
    { id: 'budgets', label: t('nav_budgets', 'Anggaran'), icon: Target },
    { id: 'savings', label: t('savings.title', 'Tabungan'), icon: PiggyBank },
    { id: 'categories', label: t('nav_master_data', 'Master'), icon: BookOpen },
  ] as const;

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto pointer-events-auto">
      <nav className="relative flex items-center justify-between bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`relative flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl cursor-pointer transition-all duration-200 select-none ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-pill"
                  className="absolute inset-0 bg-indigo-50/90 rounded-xl border border-indigo-100/80"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <Icon 
                  size={20} 
                  className={`transition-transform duration-200 ${isActive ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} 
                />
              </div>

              <span className="relative z-10 text-[10px] font-semibold leading-tight tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
