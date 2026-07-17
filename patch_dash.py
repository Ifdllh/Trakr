import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = re.sub(r"import \{ useGetMasterData, useSaveMasterData \} from '@/services/useMasterData';\n", "", content)
content = re.sub(r"import \{ useGetTransactions \} from '@/features/transactions/useTransactions';\n", "", content)

# Modify DashboardProps
props_target = re.compile(r"interface DashboardProps \{\n  user: any; // Firebase User object\n  dbUser\?: any; // Firestore User profile object\n  categories: Category\[\];\n  onOpenForm: \(type: 'pemasukan' \| 'pengeluaran'\) => void;\n  setActiveTab: \(tab: 'dashboard' \| 'transactions' \| 'categories' \| 'budgets'\) => void;\n\}")
props_replace = """interface DashboardProps {
  user: any;
  dbUser?: any;
  categories: Category[];
  onOpenForm: (type: 'pemasukan' | 'pengeluaran') => void;
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets') => void;
  transactions?: any[];
  budgets?: any[];
  periods?: any[];
  globalBudgets?: any[];
  budgetAllocations?: any[];
  accounts?: any[];
}"""
content = re.sub(props_target, props_replace, content)

# Remove hook calls and map props
hook_target = re.compile(r"  const currentUserData = useMemo.*?\[user, dbUser\]\);\n\n  const \{ data: transactions = \[\] \} = useGetTransactions\(\);\n  const \{ data: budgets = \[\] \} = useGetMasterData\('budgets'\);\n  const \{ data: periods = \[\] \} = useGetMasterData\('periods'\);\n  const \{ data: globalBudgets = \[\] \} = useGetMasterData\('globalBudgets'\);\n  const \{ data: budgetAllocations = \[\] \} = useGetMasterData\('budgetAllocations'\);\n  \n  const \{ data: accounts = \[\] \} = useGetMasterData\('accounts'\);", re.DOTALL)
hook_replace = """  const currentUserData = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      displayName: dbUser?.displayName || user.displayName || '',
      photoURL: dbUser?.photoURL || user.photoURL || '',
      phoneNumber: dbUser?.phoneNumber || user.phoneNumber || ''
    };
  }, [user, dbUser]);"""
content = re.sub(hook_target, hook_replace, content)

# Change function signature
sig_target = re.compile(r"export default function Dashboard\(\{ \n  user,\n  dbUser,\n  categories, \n  onOpenForm, \n  setActiveTab \n\}: DashboardProps\) \{")
sig_replace = """export default function Dashboard({ 
  user,
  dbUser,
  categories, 
  onOpenForm, 
  setActiveTab,
  transactions = [],
  budgets = [],
  periods = [],
  globalBudgets = [],
  budgetAllocations = [],
  accounts = []
}: DashboardProps) {"""
content = re.sub(sig_target, sig_replace, content)


with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)

print("Done")
