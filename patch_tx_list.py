import re

with open('src/features/transactions/TransactionList.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = re.sub(r"import \{ useGetTransactions \} from '@/features/transactions/useTransactions';\n", "", content)

# Modify Props
props_target = re.compile(r"interface TransactionListProps \{\n  categories: Category\[\];\n  periods: BudgetPeriod\[\];\n  accounts\?: MasterAccount\[\];\n  onEdit: \(transaction: Transaction\) => void;\n  onDelete: \(id: string\) => Promise<void>;\n\}")
props_replace = """interface TransactionListProps {
  categories: Category[];
  periods: BudgetPeriod[];
  accounts?: MasterAccount[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  transactions?: Transaction[];
}"""
content = re.sub(props_target, props_replace, content)

# Modify Signature
sig_target = re.compile(r"export default function TransactionList\(\{ categories, periods, accounts = \[\], onEdit, onDelete \}: TransactionListProps\) \{")
sig_replace = """export default function TransactionList({ categories, periods, accounts = [], onEdit, onDelete, transactions: allTransactions = [] }: TransactionListProps) {"""
content = re.sub(sig_target, sig_replace, content)

# Remove hook and add local filtering
hook_target = re.compile(r"  const currentFilters = \{ typeFilter, categoryFilter, periodFilter, searchTerm \};\n  const \{ data: rawTransactions, isLoading, isError \} = useGetTransactions\(currentFilters\);\n  const transactions = rawTransactions \|\| \[\];")
hook_replace = """  const isLoading = false;
  const isError = false;
  
  const transactions = useMemo(() => {
    let filtered = [...allTransactions];
    
    if (typeFilter !== 'semua') {
      if (typeFilter === 'pemasukan') filtered = filtered.filter(t => t.type === 'Cr' || t.type?.toLowerCase() === 'pemasukan');
      else if (typeFilter === 'pengeluaran') filtered = filtered.filter(t => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
      else if (typeFilter === 'transfer') filtered = filtered.filter(t => t.type?.toLowerCase() === 'transfer');
    }
    
    if (categoryFilter !== 'semua') {
      filtered = filtered.filter(t => t.category === categoryFilter || t.categoryId === categoryFilter);
    }
    
    if (periodFilter !== 'semua') {
      filtered = filtered.filter(t => t.periodId === periodFilter);
    }
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [allTransactions, typeFilter, categoryFilter, periodFilter, searchTerm]);"""
content = re.sub(hook_target, hook_replace, content)

with open('src/features/transactions/TransactionList.tsx', 'w') as f:
    f.write(content)

print("Done")
