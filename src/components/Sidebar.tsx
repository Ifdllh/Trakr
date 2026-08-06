import React, { useState, useEffect } from 'react';
import BrandLogo from '@/components/ui/BrandLogo';
import { 
  LayoutDashboard, History, BookOpen, Target, 
  PiggyBank, Settings as SettingsIcon, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings') => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileOpen, onCloseMobile }: SidebarProps) {
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
    { id: 'categories', label: t('nav_master_data', 'Master Data'), icon: BookOpen },
    { id: 'budgets', label: t('nav_budgets', 'Budgets'), icon: Target },
    { id: 'savings', label: t('savings.title', 'Savings Goals'), icon: PiggyBank },
    { id: 'settings', label: t('nav_settings', 'Settings'), icon: SettingsIcon }
  ] as const;

  const renderSidebarContent = (collapsed: boolean) => (
    <div 
      className={`relative flex flex-col h-full bg-white border-r border-slate-200 shrink-0 select-none transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Floating Edge Toggle Button for Desktop */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3.5 top-4.5 z-40 w-7 h-7 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full items-center justify-center shadow-xs transition-colors cursor-pointer"
        title={collapsed ? t('expand_sidebar', 'Expand Sidebar') : t('collapse_sidebar', 'Collapse Sidebar')}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Sidebar Top: Brand Logo */}
      <div className={`h-16 border-b border-slate-100 flex items-center shrink-0 ${
        collapsed ? 'justify-center px-2' : 'justify-between px-5'
      }`}>
        <BrandLogo collapsed={collapsed} />

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Vertical Navigation Stack */}
      <div className={`flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 ${collapsed ? 'px-3' : 'px-3.5'}`}>
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase transition-opacity duration-200">
            {t('menu', 'Navigation')}
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 ${
                collapsed 
                  ? 'justify-center p-3' 
                  : 'gap-3 px-3.5 py-3 text-left'
              } ${
                isActive 
                  ? 'bg-indigo-50/80 text-indigo-700 font-bold shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-indicator"
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-indigo-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={19} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              
              {!collapsed && (
                <span className="truncate overflow-hidden whitespace-nowrap transition-all duration-200">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Fixed Left Sidebar on Desktop */}
      <aside className="hidden md:block h-screen sticky top-0 shrink-0 z-30">
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
