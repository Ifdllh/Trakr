import { User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';

import { devAuth, prdAuth, setAuthEnv, getAuthEnv } from '@/lib/firebase';
import { Transaction } from '@/types';
import Auth from '@/components/ui/Auth';
import Dashboard from '@/features/reports/Dashboard';
import TransactionForm from '@/features/transactions/TransactionForm';
import TransactionList from '@/features/transactions/TransactionList';
import CategoryManager from '@/features/transactions/CategoryManager';
import BudgetManager from '@/features/budgets/BudgetManager';
import Settings from '@/features/settings/Settings';
import FloatingActionButtons from '@/components/ui/FloatingActionButtons';
import AuraChat from '@/components/ui/AuraChat';
import BrandLogo from '@/components/ui/BrandLogo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, LayoutDashboard, History, BookOpen, 
  Loader2, RefreshCw, Target, Settings as SettingsIcon
} from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const isGuest = user?.isAnonymous || user?.email?.includes('guest') || false;

  const [globalToast, setGlobalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showGlobalToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setGlobalToast({ message, type });
  };

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => {
        setGlobalToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  const [authChecked, setAuthChecked] = useState(false);

  const {
    transactions, budgets, globalBudgets, periods, accounts,
    assets, tags, contacts, customCategories, mergedCategories,
    monthlyBudget, loadingData, triggerAddMasterData, refreshData,
    handleSaveTransaction, handleDeleteTransaction, handleSaveMasterData,
    handleDeleteMasterData, handleSavePeriod, handleDeletePeriod,
    handleSaveBudgetAllocation, handleSaveGlobalBudget, handleDeleteBudgetAllocation
  } = useAppData(user, isGuest, showGlobalToast);

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'categories' | 'budgets' | 'settings'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formInitialType, setFormInitialType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const openFormWithType = (type: 'pemasukan' | 'pengeluaran') => {
    setEditingTransaction(null);
    setFormInitialType(type);
    setIsFormOpen(true);
  };

  // Keyboard shortcut for adding transaction (Ctrl + N / Cmd + N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTransaction(null);
        setIsFormOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitor Auth state change
  useEffect(() => {
    let authCheckedCount = 0;
    const checkCount = prdAuth ? 2 : 1;
    
    const handleCheck = () => {
      authCheckedCount++;
      if (authCheckedCount >= checkCount) setAuthChecked(true);
    };

    const handleUser = (currentUser: User | null, env: 'dev' | 'prd') => {
      handleCheck();
      if (currentUser) {
        setAuthEnv(env);
        setUser(currentUser);
      } else if (getAuthEnv() === env) {
        setUser(null);
      }
    };
    
    const unsubDev = onAuthStateChanged(devAuth, (u) => handleUser(u, 'dev'));
    const unsubPrd = prdAuth ? onAuthStateChanged(prdAuth, (u) => handleUser(u, 'prd')) : () => {};

    return () => {
      unsubDev();
      unsubPrd();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const authToSignOut = getAuthEnv() === 'prd' && prdAuth ? prdAuth : devAuth;
      await signOut(authToSignOut);
      setUser(null);
    } catch (err) {

    }
  };

  // Handle transaction editing request
  const handleEditRequest = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  // Loading indicator for Auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Mempersiapkan Trakr...</p>
      </div>
    );
  }

  // Show Auth login screen if not authenticated
  if (!user) {
    return <Auth onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col">
      
      {isGuest && (
        <div className="bg-indigo-600 text-white text-center py-2 px-4 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-inner shrink-0" id="guest-mode-warning-banner">
          <span>💡</span>
          <span>Anda sedang berada di <strong>Mode Uji Coba (Tamu)</strong>. Semua fitur penulisan dinonaktifkan (Baca-Saja).</span>
        </div>
      )}

      {/* Top Professional Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo and Name */}
            <div className="flex items-center gap-2.5">
              <BrandLogo />
            </div>

            {/* Middle Nav Links */}
            <nav className="hidden md:flex p-1 bg-slate-100 rounded-2xl relative">
              {[
                { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
                { id: 'transactions', label: 'Transaksi', icon: History },
                { id: 'categories', label: 'Master Data', icon: BookOpen },
                { id: 'budgets', label: 'Anggaran', icon: Target }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'transactions' | 'categories' | 'budgets')}
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-colors z-10 ${
                      isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktop-nav-indicator"
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={16} />
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Right Profile Info & Logout */}
            <div className="flex items-center gap-3 relative" id="profile-container">
              {/* User indicator Button */}
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="hidden sm:flex flex-col text-right hover:opacity-85 active:scale-98 transition-all focus:outline-none py-1 px-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100"
                id="profile-dropdown-trigger"
                title="Menu Akun"
              >
                <span className="text-xs font-bold text-slate-900 truncate max-w-[150px] flex items-center gap-1.5 justify-end">
                  {user.displayName || (user.isAnonymous ? 'Pengguna Tamu' : 'Pengguna')}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user.isAnonymous ? 'Mode Tamu' : user.email}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    {/* Transparent Clickable Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                      id="profile-dropdown-backdrop"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200/80 shadow-lg rounded-xl py-1.5 z-50 text-left origin-top-right"
                      id="profile-dropdown-menu"
                    >
                      <div className="px-3.5 py-2.5 border-b border-slate-100 mb-1" id="profile-dropdown-header">
                        <p className="text-xs font-bold text-slate-800 truncate">{user.displayName || (user.isAnonymous ? 'Pengguna Tamu' : 'Pengguna')}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{user.email || 'Mode Tamu'}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors flex items-center gap-2.5"
                        id="profile-menu-settings"
                      >
                        <SettingsIcon size={14} className="text-slate-400" />
                        Pengaturan Akun
                      </button>

                      <button
                        onClick={() => {
                          setLogoutModalOpen(true);
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 transition-colors flex items-center gap-2.5 border-t border-slate-100 mt-1"
                        id="profile-menu-logout"
                      >
                        <LogOut size={14} className="text-rose-500" />
                        Keluar Akun
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Mobile direct settings button (or desktop standalone backup) */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-2.5 rounded-xl transition-all border bg-white ${
                  activeTab === 'settings'
                    ? 'text-indigo-600 border-indigo-200 bg-indigo-50/30'
                    : 'text-gray-400 hover:text-slate-600 border-gray-100'
                }`}
                title="Pengaturan"
                id="header-settings-btn"
              >
                <SettingsIcon size={16} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic header / Floating logger actions */}
        {activeTab !== 'settings' && (
          <div className="pb-2 mb-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'Dasbor Finansial'}
              {activeTab === 'transactions' && 'Daftar Transaksi'}
              {activeTab === 'categories' && 'Manajemen Master Data'}
              {activeTab === 'budgets' && 'Anggaran'}
            </h2>
          </div>
        )}

        {/* Real-time Loader Overlay when syncing Firestore */}
        {loadingData && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Menyinkronkan data keuangan secara real-time dengan Cloud SQL...
          </div>
        )}

        {/* Tab Viewport with smooth entry transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user}
                categories={mergedCategories}
                onOpenForm={openFormWithType}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionList periods={periods} 
                categories={mergedCategories}
                accounts={accounts}
                onEdit={handleEditRequest}
                onDelete={handleDeleteTransaction}
              />
            )}

            {activeTab === 'categories' && (
              <CategoryManager 
                categories={mergedCategories}
                customCategories={customCategories}
                periods={periods}
                accounts={accounts}
                assets={assets}
                tags={tags}
                contacts={contacts}
                transactions={transactions}
                budgets={budgets}
                onSavePeriod={handleSavePeriod}
                onDeletePeriod={handleDeletePeriod}
                onSaveMasterData={handleSaveMasterData}
                onDeleteMasterData={handleDeleteMasterData}
                onRefreshData={refreshData}
                globalAddTrigger={triggerAddMasterData}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetManager 
                categories={mergedCategories}
                transactions={transactions}
                monthlyBudget={monthlyBudget}
                budgets={budgets}
                periods={periods}
                globalBudgets={globalBudgets}
                accounts={accounts}
                assets={assets}
                tags={tags}
                contacts={contacts}
                onSaveBudget={handleSaveBudgetAllocation}
                onDeleteBudget={handleDeleteBudgetAllocation}
                onSaveGlobalBudget={handleSaveGlobalBudget}
              />
            )}

            {activeTab === 'settings' && (
              <Settings 
                user={user}
                setActiveTab={setActiveTab}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Global Floating Action Buttons */}
      <FloatingActionButtons 
        onAddTransaction={() => {
          setEditingTransaction(null);
          setIsFormOpen(true);
        }}
        onOpenChat={() => setIsChatOpen(true)}
      />
      
      <AnimatePresence>
        {isChatOpen && (
          <AuraChat 
            onClose={() => setIsChatOpen(false)}
            onRefreshData={refreshData}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar for Mobile Devices */}
      <footer className="md:hidden bg-white border-t border-slate-200 sticky bottom-0 z-40 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] pb-safe">
        <div className="grid grid-cols-5 text-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all ${
              activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px]">Dasbor</span>
          </button>
          
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all ${
              activeTab === 'transactions' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <History size={20} />
            <span className="text-[10px]">Transaksi</span>
          </button>

          <button
            onClick={() => setActiveTab('budgets')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all ${
              activeTab === 'budgets' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Target size={20} />
            <span className="text-[10px]">Anggaran</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all ${
              activeTab === 'categories' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <BookOpen size={20} />
            <span className="text-[10px]">Master</span>
          </button>
          
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1.5 text-slate-400 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
            <span className="text-[10px]">Keluar</span>
          </button>
        </div>
      </footer>

      {/* Transaction Logging Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TransactionForm 
            categories={mergedCategories}
            onSave={handleSaveTransaction}
            onClose={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
            transactionToEdit={editingTransaction}
            initialType={formInitialType}
            accounts={accounts}
            assets={assets}
            tags={tags}
            contacts={contacts}
            onSaveMasterData={handleSaveMasterData}
          />
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            id="logout-confirmation-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center"
              id="logout-confirmation-modal-card"
            >
              <div className="bg-rose-100 text-rose-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-4" id="logout-modal-icon">
                <LogOut size={22} />
              </div>
              
              <h3 className="text-lg font-bold text-slate-800" id="logout-modal-title">Konfirmasi Keluar</h3>
              <p className="text-sm text-slate-500 mt-2" id="logout-modal-description">
                Apakah Anda yakin ingin keluar? Anda harus masuk kembali untuk mengakses data Anda.
              </p>
              
              <div className="flex gap-3 mt-6" id="logout-modal-actions">
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  id="logout-cancel-btn"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoutModalOpen(false);
                    handleLogout();
                  }}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
                  id="logout-confirm-btn"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {globalToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            id="global-toast-container"
          >
            <div className={`px-5 py-3 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 border ${
              globalToast.type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <span>{globalToast.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{globalToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
