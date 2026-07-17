import re

with open('src/features/budgets/BudgetManager.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = re.sub(r"import \{\s+useGetAggregatedBudgets,\s+useDeleteCategoryBudget,\s+useGetBudgetTransactions,\s+useGetBudgetStatus,\s+useSuggestBudgets\s+\} from '@/features/budgets/useBudgets';\n", "", content)

# Remove unused query client
content = re.sub(r"  const queryClient = useQueryClient\(\);\n", "", content)

# Replace delete mutation
content = re.sub(r"  const deleteBudgetMutation = useDeleteCategoryBudget\(selectedPeriod\);", "  const deleteBudgetMutation = { mutateAsync: onDeleteBudget };", content)

# Replace hooks usage
hooks_target = re.compile(r"  // 2\. Fetch aggregated data & budget status KPIs via React Query\n  const \{ data = \[\], isLoading: isLoadingBudgets \} = useGetAggregatedBudgets\(selectedPeriod\);\n  const currentBudgets = data as any\[\];\n  const \{ data: budgetStatus = \{ targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 \} \} = useGetBudgetStatus\(selectedPeriod\);\n.*?// Suggest Budgets Query\n  const \{ refetch: fetchSuggestions, isFetching: isFetchingSuggestions \} = useSuggestBudgets\(targetMonth, targetYear\);", re.DOTALL)

hooks_replace = """  // 2. Local computations for Budgets
  const currentBudgets = useMemo(() => budgets.filter(b => b.periodId === selectedPeriod), [budgets, selectedPeriod]);
  
  const budgetStatus = useMemo(() => {
    if (!selectedPeriod) return { targetGlobal: 0, totalTeralokasi: 0, realisasiAktual: 0, sisaSaldo: 0 };
    const periodBudgets = budgets.filter((b: any) => b.periodId === selectedPeriod);
    const periodGlobal = globalBudgets.find((b: any) => b.periodId === selectedPeriod);
    const periodTxs = transactions.filter((t: any) => t.periodId === selectedPeriod && (t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran'));
    
    const targetGlobal = periodGlobal ? Number((periodGlobal as any).totalTargetAmount) : 0;
    const totalTeralokasi = periodBudgets.reduce((sum: number, b: any) => sum + Number(b.calculatedAmount || b.value || 0), 0);
    const realisasiAktual = periodTxs.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    return { targetGlobal, totalTeralokasi, realisasiAktual, sisaSaldo: targetGlobal - realisasiAktual };
  }, [selectedPeriod, budgets, globalBudgets, transactions]);
  
  const isLoadingBudgets = false;

  const activeGlobalBudget = useMemo(() => {
    return globalBudgets.find(gb => gb.periodId === selectedPeriod);
  }, [globalBudgets, selectedPeriod]);

  const currentPeriodObj = periods.find(p => p.id === selectedPeriod);

  const { targetMonth, targetYear } = useMemo(() => {
    const periodObj = periods.find(p => p.id === selectedPeriod || String(p.id) === String(selectedPeriod));
    let m = new Date().getMonth() + 1;
    let y = new Date().getFullYear();
    if (periodObj && periodObj.startDate) {
      const parts = periodObj.startDate.split('-');
      if (parts.length >= 2) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
      }
    }
    return { targetMonth: m, targetYear: y };
  }, [periods, selectedPeriod]);

  // Suggest Budgets Query
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const fetchSuggestions = async () => {
    setIsFetchingSuggestions(true);
    try {
      const expTxs = transactions.filter((t: any) => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
      const map: Record<string, number> = {};
      expTxs.forEach((tx: any) => {
         const cat = tx.category || tx.categoryId || 'Lainnya';
         map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
      });
      const data = Object.keys(map).map(k => ({
         category_id: k,
         suggested_amount: Math.round(map[k] / 3) // Average loosely
      }));
      return { data };
    } finally {
      setIsFetchingSuggestions(false);
    }
  };"""
content = re.sub(hooks_target, hooks_replace, content)

# Replace budget transactions hook
tx_hook_target = re.compile(r"  const \{ data: budgetTransactions = \[\], isLoading: isLoadingTransactions \} = useGetBudgetTransactions\(\n    selectedBudgetForDetail\?.categoryId \|\| '',\n    selectedPeriod \|\| ''\n  \);")
tx_hook_replace = """  const budgetTransactions = useMemo(() => {
    if (!selectedBudgetForDetail?.categoryId || !selectedPeriod) return [];
    return transactions.filter(t => 
      t.periodId === selectedPeriod && 
      (String(t.category) === String(selectedBudgetForDetail.categoryId) || String(t.categoryId) === String(selectedBudgetForDetail.categoryId))
    );
  }, [transactions, selectedPeriod, selectedBudgetForDetail]);
  const isLoadingTransactions = false;"""
content = re.sub(tx_hook_target, tx_hook_replace, content)


with open('src/features/budgets/BudgetManager.tsx', 'w') as f:
    f.write(content)

print("Done")
