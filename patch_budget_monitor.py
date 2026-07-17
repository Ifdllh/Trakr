import re

with open('src/features/reports/BudgetMonitor.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = re.sub(r"import \{ useGetMasterData \} from '@/services/useMasterData';\n", "", content)
content = re.sub(r"import \{ useGetAggregatedBudgets \} from '@/features/budgets/useBudgets';\n", "", content)

# Modify BudgetMonitorProps
props_target = re.compile(r"interface BudgetMonitorProps \{\n  globalDashboardDate: Date;\n  categories\?: any\[\];\n  setActiveTab\?: \(tab: 'dashboard' \| 'transactions' \| 'categories' \| 'budgets'\) => void;\n\}")
props_replace = """interface BudgetMonitorProps {
  globalDashboardDate: Date;
  categories?: any[];
  setActiveTab?: (tab: 'dashboard' | 'transactions' | 'categories' | 'budgets') => void;
  periods?: any[];
  budgets?: any[];
  transactions?: any[];
}"""
content = re.sub(props_target, props_replace, content)

# Modify function signature
sig_target = re.compile(r"export default function BudgetMonitor\(\{\n  globalDashboardDate,\n  categories = \[\],\n  setActiveTab\n\}: BudgetMonitorProps\) \{")
sig_replace = """export default function BudgetMonitor({
  globalDashboardDate,
  categories = [],
  setActiveTab,
  periods = [],
  budgets = [],
  transactions = []
}: BudgetMonitorProps) {"""
content = re.sub(sig_target, sig_replace, content)

# Modify data fetching hooks
hooks_target = re.compile(r"  // 1\. Fetch real periods and find the matching active period\n  const \{ data: periods = \[\], isLoading: isLoadingPeriods \} = useGetMasterData\('periods'\);\n.*?const \{ data: rawBudgets = \[\], isLoading: isLoadingBudgets \} = useGetAggregatedBudgets\(\n    activePeriodId \? activePeriodId\.toString\(\) : ''\n  \);\n  const isLoading = isLoadingPeriods \|\| \(\!\!activePeriodId && isLoadingBudgets\);", re.DOTALL)
hooks_replace = """  // 1. Find the matching active period
  const activePeriodId = useMemo(() => {
    const targetMonthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    const targetPrefix = `${selectedYear}-${targetMonthStr}`;
    const matchingPeriod = periods.find((p: any) => {
      if (p.startDate && p.startDate.startsWith(targetPrefix)) return true;
      if (p.name && (p.name || '').toLowerCase().includes(targetPrefix)) return true;
      return false;
    });
    return matchingPeriod?.id || null;
  }, [periods, selectedMonth, selectedYear]);

  // 2. Compute raw budgets for the current active period
  const rawBudgets = useMemo(() => {
     if (!activePeriodId) return [];
     return budgets.filter((b: any) => b.periodId === activePeriodId);
  }, [budgets, activePeriodId]);
  
  const isLoading = false;"""
content = re.sub(hooks_target, hooks_replace, content)

with open('src/features/reports/BudgetMonitor.tsx', 'w') as f:
    f.write(content)

print("Done")
