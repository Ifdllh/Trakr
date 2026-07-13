import fs from 'fs';

let code = fs.readFileSync('src/features/reports/Dashboard.tsx', 'utf8');

// Replace cashflowStatsData useQuery
code = code.replace(
  /const \{ data: cashflowStatsData = \[\] \} = useQuery\(\{[\s\S]*?queryKey: \['cashflowStats', selectedYear\],[\s\S]*?queryFn: async \(\) => \{[\s\S]*?const \{ data \} = await api\.get\('\/reports\/cashflow-stats', \{[\s\S]*?params: \{ year: selectedYear \}[\s\S]*?\}\);[\s\S]*?return data;[\s\S]*?\}[\s\S]*?\}\);/,
  `
  // Calculate cashflow chart data locally
  const cashflowStatsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const result = months.map(m => ({ month: m, income: 0, expense: 0 }));
    
    transactions.forEach(tx => {
      if (!tx.date) return;
      const date = new Date(tx.date);
      if (date.getFullYear() === selectedYear) {
        const monthIdx = date.getMonth();
        if (tx.type === 'Cr' || tx.type?.toLowerCase() === 'pemasukan') {
          result[monthIdx].income += Number(tx.amount || 0);
        } else if (tx.type === 'Dr' || tx.type?.toLowerCase() === 'pengeluaran') {
          result[monthIdx].expense += Number(tx.amount || 0);
        }
      }
    });
    return result;
  }, [transactions, selectedYear]);
  `
);

// Replace expenseDistribution useQuery
code = code.replace(
  /const \{ data: expenseDistribution = \[\] \} = useQuery\(\{[\s\S]*?queryKey: \['expenseDistribution', activePeriodId\],[\s\S]*?queryFn: async \(\) => \{[\s\S]*?const \{ data \} = await api\.get\('\/reports\/expense-distribution', \{[\s\S]*?params: \{ period_id: activePeriodId \}[\s\S]*?\}\);[\s\S]*?return data;[\s\S]*?\},[\s\S]*?enabled: !!activePeriodId[\s\S]*?\}\);/,
  `
  // Calculate expense distribution locally
  const expenseDistribution = useMemo(() => {
    if (!activePeriodId) return [];
    
    const expTxs = transactions.filter(t => t.periodId === activePeriodId && (t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran'));
    const map: Record<string, number> = {};
    expTxs.forEach(tx => {
       const cat = tx.category || 'Lainnya';
       map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
    });
    
    const distData = Object.keys(map).map(k => ({
       category: k,
       amount: map[k],
       color: '#6366F1'
    }));
    
    const colors = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#F43F5E', '#10B981', '#3B82F6', '#8B5CF6'];
    return distData.sort((a,b) => b.amount - a.amount).map((d, i) => ({ ...d, color: colors[i % colors.length] }));
  }, [transactions, activePeriodId]);
  `
);

fs.writeFileSync('src/features/reports/Dashboard.tsx', code);
