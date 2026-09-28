import React, { useState, useEffect } from 'react';
import BrandLogo from '@/components/ui/BrandLogo';
import { 
  LayoutDashboard, History, BookOpen, Target, 
  PiggyBank, Settings as SettingsIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings') => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'transactions', label: t('nav_transactions', 'Transactions'), icon: History },
    { id: 'budgets', label: t('nav_budgets', 'Budgets'), icon: Target },
    { id: 'savings', label: t('savings.title', 'Savings Goals'), icon: PiggyBank },
    { id: 'categories', label: t('nav_master_data', 'Master Data'), icon: BookOpen },
    { id: 'settings', label: t('nav_settings', 'Settings'), icon: SettingsIcon }
  ] as const;

  return (
    <aside className="hidden md:flex h-screen sticky top-0 shrink-0 z-30">
      <div 
        className={`relative flex flex-col h-full bg-white border-r border-slate-200/80 shrink-0 select-none transition-all duration-300 ease-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Floating Edge Toggle Button for Desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-5 z-40 w-7 h-7 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
          title={isCollapsed ? t('expand_sidebar', 'Expand Sidebar') : t('collapse_sidebar', 'Collapse Sidebar')}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar Top Header: Brand Logo */}
        <div className={`h-16 border-b border-slate-100 flex items-center shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}>
          <BrandLogo collapsed={isCollapsed} />
        </div>

        {/* Vertical Navigation Stack */}
        <div className={`flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 ${isCollapsed ? 'px-3' : 'px-3.5'}`}>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('menu', 'Navigation')}
            </div>
          )}

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3' 
                    : 'gap-3 px-3.5 py-3 text-left'
                } ${
                  isActive 
                    ? 'text-indigo-600 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="absolute inset-0 bg-indigo-50/80 rounded-xl border border-indigo-100/80"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Active Bar Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-indicator"
                    className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-indigo-600 rounded-r-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon 
                  size={19} 
                  className={`relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                  }`} 
                />
                
                {!isCollapsed && (
                  <span className="relative z-10 truncate overflow-hidden whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        {!isCollapsed && (
          <div className="p-3.5 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-600 truncate">
                  Trakr Pro App
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">v2.4</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

