with open('src/features/reports/BudgetMonitor.tsx', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "const { data: periods" in line:
        skip = True
    
    if skip and "const isLoading =" in line:
        skip = False
        out.append("""  // 1. Find the matching active period
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
  
  const isLoading = false;
""")
        continue
    
    if not skip:
        out.append(line)

with open('src/features/reports/BudgetMonitor.tsx', 'w') as f:
    f.writelines(out)
