import re

with open('src/features/reports/BudgetMonitor.tsx', 'r') as f:
    content = f.read()

target = re.compile(r"  // 1\. Fetch real periods and find the matching active period\n  const \{ data: periods = \[\], isLoading: isLoadingPeriods \} = useGetMasterData\('periods'\);\n.*?const \{ data: rawBudgets = \[\], isLoading: isLoadingBudgets \} = useGetAggregatedBudgets\([\s\S]*?\);\n  const isLoading = isLoadingPeriods \|\| \(\!\!activePeriodId && isLoadingBudgets\);", re.DOTALL)
replace = """  // 1. Find the matching active period
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
content = re.sub(target, replace, content)

with open('src/features/reports/BudgetMonitor.tsx', 'w') as f:
    f.write(content)

print("Done")
