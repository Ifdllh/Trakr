import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Insert state hooks
content = content.replace(
    "const { data: globalBudgets = [] } = useGetMasterData('globalBudgets');",
    "const { data: globalBudgets = [] } = useGetMasterData('globalBudgets');\n  const { data: budgetAllocations = [] } = useGetMasterData('budgetAllocations');"
)

# Insert calculations
calc_insertion = """
  const activeBudgetAllocations = useMemo(() => {
    if (!activePeriodId) return [];
    return budgetAllocations.filter((b: any) => b.periodId === activePeriodId.toString() || b.periodId === Number(activePeriodId));
  }, [budgetAllocations, activePeriodId]);

  const budgetAlerts = useMemo(() => {
    const alerts: { categoryName: string, spent: number, limit: number, percentage: number }[] = [];
    
    activeBudgetAllocations.forEach((alloc: any) => {
      const category = categories.find(c => c.id === alloc.categoryId);
      if (!category) return;
      
      const spent = monthlyTransactions
        .filter(t => t.type === 'pengeluaran' && t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const limit = alloc.calculatedAmount || 0;
      if (limit > 0) {
        const percentage = (spent / limit) * 100;
        if (percentage >= 80) {
          alerts.push({
            categoryName: category.name,
            spent,
            limit,
            percentage
          });
        }
      }
    });

    return alerts.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  }, [activeBudgetAllocations, categories, monthlyTransactions]);

"""

# Insert calc_insertion after activeGlobalBudget logic
match = re.search(r'const monthlyBudget =.*?;', content)
if match:
    content = content[:match.end()] + calc_insertion + content[match.end():]

# Now, build the replacement layout for Hero
new_layout = """      {/* 1. Static Hero Section (Top): 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Total Kekayaan Bersih (Net Worth) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Kekayaan Bersih</span>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{balanceParts.main}</span>
                <span className="text-sm font-bold text-gray-400">{balanceParts.cents}</span>
              </div>
              <div className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                +5.2% ↗ <span className="text-gray-400 font-medium">dari bulan lalu</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-50 flex items-center gap-3">
            <button onClick={() => onOpenForm('pemasukan')} className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <TrendingUp size={14} /> Pemasukan
            </button>
            <button onClick={() => onOpenForm('pengeluaran')} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer">
              <TrendingDown size={14} /> Pengeluaran
            </button>
          </div>
        </div>

        {/* Card 2: Arus Kas (Income vs Expense) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-full">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-3">Arus Kas Bulan Ini</span>
              <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-bold block">Total Pemasukan</span>
                  <div className="flex items-baseline gap-0.5 tabular-nums">
                    <span className="text-xl font-black text-emerald-600 tracking-tight">{monthlyIncomeParts.main}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-gray-500 font-bold block">Total Pengeluaran</span>
                  <div className="flex items-baseline justify-end gap-0.5 tabular-nums">
                    <span className="text-xl font-black text-rose-500 tracking-tight">-{monthlyExpenseParts.main}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-50">
            <div className="w-full bg-emerald-100 h-2.5 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${finalDisplayIncome === 0 ? 0 : Math.min((finalDisplayExpense / finalDisplayIncome) * 100, 100)}%` }}
                className="h-full bg-rose-500 transition-all duration-500 rounded-r-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold">
              <span className="text-emerald-700">Pemasukan</span>
              <span className="text-rose-600">
                {finalDisplayIncome > 0 ? Math.round((finalDisplayExpense / finalDisplayIncome) * 100) : 0}% terpakai
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Peringatan Anggaran (Budget Warning) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col min-h-[180px]">
          <div className="flex justify-between items-center mb-4">
             <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Peringatan Anggaran</span>
              <p className="text-[10px] font-medium text-gray-500">Kategori dengan limit &gt; 80%</p>
             </div>
             <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-3">
            {budgetAlerts.length > 0 ? (
              budgetAlerts.map((alert, idx) => {
                const isBreached = alert.percentage >= 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-700 truncate mr-2">{alert.categoryName}</span>
                      <span className={isBreached ? "text-rose-600 shrink-0" : "text-amber-600 shrink-0"}>
                        {Math.round(alert.percentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                        className={`h-full transition-all duration-500 rounded-full ${isBreached ? 'bg-rose-500' : 'bg-amber-500'}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-2 space-y-2">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-xs font-bold text-emerald-700">Semua anggaran aman bulan ini</p>
              </div>
            )}
          </div>
        </div>
      </div>"""

start_marker = "{/* 1. Static Hero Section (Top): 3 Main Cards */}"
end_marker = "{/* 2. Toggleable Widget Section (Middle/Bottom) */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_layout + "\n\n      " + content[end_idx:]
    with open('src/features/reports/Dashboard.tsx', 'w') as f:
        f.write(content)
    print("Successfully replaced layout section.")
else:
    print(f"Could not find markers. start: {start_idx}, end: {end_idx}")

