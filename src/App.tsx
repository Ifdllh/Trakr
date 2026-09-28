import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { User } from 'firebase/auth';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';

import { devAuth, prdAuth, setAuthEnv, getAuthEnv } from '@/lib/firebase';
import { Transaction } from '@/types';
import { api } from '@/lib/api';
import Auth from '@/components/ui/Auth';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/features/reports/Dashboard';
import TransactionForm from '@/features/transactions/TransactionForm';
import TransactionList from '@/features/transactions/TransactionList';
import CategoryManager from '@/features/transactions/CategoryManager';
import BudgetManager from '@/features/budgets/BudgetManager';
import Settings from '@/features/settings/Settings';
import { SavingsPage } from '@/features/savings/SavingsPage';
import FloatingActionButtons from '@/components/ui/FloatingActionButtons';
import BottomNav from '@/components/ui/BottomNav';
import BrandLogo from '@/components/ui/BrandLogo';
import { Sidebar } from '@/components/Sidebar';
import { PageTransition } from '@/components/PageTransition';
import { ReactLenis } from 'lenis/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, LayoutDashboard, History, BookOpen, 
  Loader2, RefreshCw, Target, Settings as SettingsIcon, PiggyBank
} from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useTranslation } from 'react-i18next';

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email && email.trim()) {
    const namePart = email.split('@')[0];
    return namePart[0].toUpperCase();
  }
  return '?';
};
function IdleMonitor() {
  const { isWarningPhase, timeLeft, keepLoggedIn, handleLogout } = useIdleTimeout(1620000, 180000);
  const { t } = useTranslation();

  if (!isWarningPhase) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
        <h3 className="text-lg font-bold text-slate-800">{t('timeout.modal_title')}</h3>
        <p className="text-sm text-slate-500 mt-2">
          {t('timeout.modal_desc')} <strong className="text-indigo-600 ml-1">{formattedTime}</strong>
        </p>
        
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            {t('timeout.btn_logout')}
          </button>
          <button
            type="button"
            onClick={keepLoggedIn}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('timeout.btn_stay')}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const isGuest = user?.isAnonymous || user?.email?.includes('guest') || false;

  const [authChecked, setAuthChecked] = useState(false);
  const [dbUser, setDbUser] = useState<any>(() => {
    try {
      const localPrefsRaw = localStorage.getItem('app_preferences');
      if (localPrefsRaw) {
        const prefs = JSON.parse(localPrefsRaw);
        if (prefs?.language) i18n.changeLanguage(prefs.language);
        return prefs;
      }
    } catch (e) {}
    return null;
  });

  const currentUserData = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      displayName: dbUser?.displayName || user.displayName || '',
      photoURL: dbUser?.photoURL || user.photoURL || '',
      phoneNumber: dbUser?.phoneNumber || user.phoneNumber || ''
    };
  }, [user, dbUser]);

  const handleProfileUpdate = useCallback((updatedData: any) => {
    setDbUser((prev: any) => ({
      ...prev,
      ...updatedData
    }));
  }, []);

  // Fetch Firestore user profile
  useEffect(() => {
    const fetchDbProfile = async () => {
      try {
        const response = await api.get('/user/profile');
        if (response.data) {
          let localPrefs = {};
          try {
            const raw = localStorage.getItem('app_preferences');
            if (raw) localPrefs = JSON.parse(raw);
          } catch(e) {}
          setDbUser((prev: any) => ({ ...prev, ...response.data, ...localPrefs }));
        }
      } catch (err: any) {
        const isQuotaError = err?.response?.status === 429 || err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Quota');
        if (!isQuotaError) {
          console.error('Failed to fetch Firestore user profile in App:', err);
        } else {
          console.warn('Firestore user profile fetch rate-limited or quota exceeded (429), using local fallback.');
        }
        try {
          const localPrefsRaw = localStorage.getItem('app_preferences');
          if (localPrefsRaw) {
            setDbUser((prev: any) => ({ ...JSON.parse(localPrefsRaw), ...(prev || {}) }));
          }
        } catch (e) {}
      }
    };
    if (user) {
      fetchDbProfile();
    } else {
      try {
        const localPrefsRaw = localStorage.getItem('app_preferences');
        if (localPrefsRaw) {
          setDbUser(JSON.parse(localPrefsRaw));
          return;
        }
      } catch (e) {}
      setDbUser(null);
    }
  }, [user]);

  // Sync Theme preference to documentElement class list
  useEffect(() => {
    const savedTheme = dbUser?.theme;
    const root = window.document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dbUser?.theme]);

  // Sync Privacy Mode preference to documentElement class list
  useEffect(() => {
    const isPrivacy = dbUser?.privacyMode === true;
    const root = window.document.documentElement;
    if (isPrivacy) {
      root.classList.add('privacy-mode-active');
    } else {
      root.classList.remove('privacy-mode-active');
    }
  }, [dbUser?.privacyMode]);

  // Sync Language preference to i18n instance
  useEffect(() => {
    if (dbUser?.language) {
      i18n.changeLanguage(dbUser.language);
    }
  }, [dbUser?.language, i18n]);

  const {
    transactions, budgets, globalBudgets, periods, accounts,
    assets, tags, contacts, customCategories, mergedCategories,
    monthlyBudget, loadingData, triggerAddMasterData, refreshData,
    handleSaveTransaction, handleDeleteTransaction, handleSaveMasterData,
    handleDeleteMasterData, handleSavePeriod, handleDeletePeriod,
    handleSaveBudgetAllocation, handleSaveGlobalBudget, handleDeleteBudgetAllocation
  } = useAppData(user, isGuest);

  const navigate = useNavigate();
  const location = useLocation();

  // UI Tabs & Modals
  const [activeTab, _setActiveTab] = useState<'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings'>('dashboard');
  
  const setActiveTab = (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'savings' | 'settings') => {
    _setActiveTab(tab);
    navigate('/' + tab);
  };

  // Synchronize URL path with activeTab state
  useEffect(() => {
    if (user) {
      const path = location.pathname;
      if (path === '/' || path === '/login') {
        const defaultPage = dbUser?.defaultLandingPage || 'dashboard';
        navigate('/' + defaultPage, { replace: true });
        _setActiveTab(defaultPage);
      } else {
        const tab = path.replace('/', '');
        if (['dashboard', 'transactions', 'categories', 'budgets', 'savings', 'settings'].includes(tab)) {
          if (activeTab !== tab) {
            _setActiveTab(tab as any);
          }
        } else {
          // If unknown path, go to preferred landing page
          const defaultPage = dbUser?.defaultLandingPage || 'dashboard';
          navigate('/' + defaultPage, { replace: true });
          _setActiveTab(defaultPage);
        }
      }
    } else if (authChecked) {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [location.pathname, user, authChecked, navigate, activeTab, dbUser?.defaultLandingPage]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formInitialType, setFormInitialType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return t('nav_dashboard', 'Dashboard');
      case 'transactions':
        return t('nav_transactions', 'Transactions');
      case 'categories':
        return t('nav_master_data', 'Master Data');
      case 'budgets':
        return t('nav_budgets', 'Budgets');
      case 'savings':
        return t('savings.title', 'Savings Goals');
      case 'settings':
        return t('nav_settings', 'Settings');
      default:
        return 'TRAKR';
    }
  };

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
      const currentEnv = getAuthEnv();
      
      // Only accept state changes from the actively selected environment
      if (env === currentEnv) {
        setUser(currentUser);
      } else if (currentUser && env !== currentEnv) {
        // If we detect a login in the non-active environment, sign it out to prevent confusion
        const authObj = env === 'prd' ? prdAuth : devAuth;
        if (authObj) {
          authObj.signOut().catch(() => {});
        }
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
        <p className="mt-4 text-sm font-semibold text-gray-500">{t('preparing_trakr')}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Auth onSuccess={() => navigate('/dashboard')} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/*" element={
        user ? (
          <>
            <IdleMonitor />
          <div className="relative flex h-screen overflow-hidden bg-slate-50/50 text-slate-800 font-sans">
            {/* Fixed Left Sidebar for Desktop */}
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />

            {/* Main Content Area Wrapper */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
              
              {isGuest && (
                <div className="bg-indigo-600 text-white text-center py-2 px-4 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-inner shrink-0" id="guest-mode-warning-banner">
                  <span>💡</span>
                  <span>{t('guest_mode_warning')}</span>
                </div>
              )}

              {/* Minimal Contextual Top Header */}
              <header className="h-16 px-4 md:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="md:hidden shrink-0">
                    <BrandLogo />
                  </div>
                  <h1 className="hidden md:block text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                    {getPageTitle(activeTab)}
                  </h1>
                </div>

                {/* Right Profile Info & Actions */}
                <div className="flex items-center relative" id="profile-container">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-100/80 active:scale-98 transition-colors duration-200 focus:outline-none py-1.5 px-2.5 rounded-lg border border-transparent hover:border-slate-200/50"
                    id="profile-dropdown-trigger"
                    title="Menu Akun"
                  >
                    <span className="hidden sm:inline text-xs md:text-sm font-semibold text-slate-700 max-w-[120px] md:max-w-[180px] truncate" id="profile-display-name">
                      {currentUserData?.displayName || (user?.isAnonymous ? t('user_guest') : t('user_regular'))}
                    </span>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-slate-200 bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0" id="profile-avatar">
                      {currentUserData?.photoURL ? (
                        <img 
                          src={currentUserData.photoURL} 
                          alt={currentUserData.displayName || 'Avatar'} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span>{getInitials(currentUserData?.displayName, user?.email)}</span>
                      )}
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
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
                            <p className="text-xs font-bold text-slate-800 truncate">{currentUserData?.displayName || (user?.isAnonymous ? t('user_guest') : t('user_regular'))}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{user.email || t('mode_guest')}</p>
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
                            {t('nav_settings')}
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
                            {t('nav_logout')}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </header>

              {/* Main Content Area */}
              <ReactLenis 
                root={false}
                options={{ lerp: 0.08, duration: 1.2, smoothWheel: true, touchMultiplier: 1.5 }}
                className="flex-1 overflow-y-auto p-4 md:p-8 pb-36 md:pb-8 scroll-smooth" 
                id="main-content-area"
              >
                <div className="max-w-[1440px] mx-auto w-full">
                  <PageTransition pageKey={activeTab}>
                    {activeTab === 'dashboard' && (
                      <Dashboard 
                        user={user}
                        dbUser={dbUser}
                        categories={mergedCategories}
                        onOpenForm={openFormWithType}
                        setActiveTab={setActiveTab}
                        transactions={transactions}
                        budgets={budgets}
                        periods={periods}
                        globalBudgets={globalBudgets}
                        accounts={accounts}
                        assets={assets}
                        onSaveGlobalBudget={handleSaveGlobalBudget}
                      />
                    )}

                    {activeTab === 'transactions' && (
                      <TransactionList 
                        user={user}
                        periods={periods} 
                        categories={mergedCategories}
                        accounts={accounts}
                        onEdit={handleEditRequest}
                        onDelete={handleDeleteTransaction}
                        transactions={transactions}
                      />
                    )}

                    {activeTab === 'categories' && (
                      <CategoryManager 
                        user={user}
                        categories={mergedCategories}
                        customCategories={customCategories}
                        periods={periods}
                        accounts={accounts}
                        assets={assets}
                        tags={tags}
                        contacts={contacts}
                        transactions={transactions}
                        budgets={budgets}
                        dbUser={dbUser}
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
                        user={user}
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

                    {activeTab === 'savings' && (
                      <SavingsPage 
                        user={user}
                        accounts={accounts}
                        categories={mergedCategories}
                        customCategories={customCategories}
                        onSaveTransaction={handleSaveTransaction}
                        onSaveMasterData={handleSaveMasterData}
                      />
                    )}

                    {activeTab === 'settings' && (
                      <Settings 
                        user={user}
                        dbUser={dbUser}
                        onProfileUpdate={handleProfileUpdate}
                        setActiveTab={setActiveTab}
                      />
                    )}
                  </PageTransition>
                </div>
              </ReactLenis>
            </div>

            {/* Global Floating Action Buttons */}
            <FloatingActionButtons 
              onAddTransaction={() => {
                setEditingTransaction(null);
                setIsFormOpen(true);
              }}
            />

            {/* Modern Floating Bottom Nav Dock for Mobile Devices */}
            <BottomNav 
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              onAddTransaction={() => {
                setEditingTransaction(null);
                setIsFormOpen(true);
              }}
            />

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
            periods={periods}
            dbUser={dbUser}
            user={user}
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
              
              <h3 className="text-lg font-bold text-slate-800" id="logout-modal-title">{t('confirm_logout_title')}</h3>
              <p className="text-sm text-slate-500 mt-2" id="logout-modal-description">
                {t('confirm_logout_desc')}
              </p>
              
              <div className="flex gap-3 mt-6" id="logout-modal-actions">
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  id="logout-cancel-btn"
                >
                  {t('cancel')}
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
                  {t('yes_logout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
            </div>
          </>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}
