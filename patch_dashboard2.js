import fs from 'fs';

let code = fs.readFileSync('src/features/reports/Dashboard.tsx', 'utf8');

code = code.replace(
  /const \{ data: rawExpenseDistribution = \[\] \} = useQuery\(\{[\s\S]*?queryKey: \['expenseDistribution', selectedMonth, selectedYear\],[\s\S]*?queryFn: async \(\) => \{[\s\S]*?const \{ data \} = await api\.get\('\/reports\/expense-distribution', \{[\s\S]*?params: \{ month: selectedMonth, year: selectedYear \}[\s\S]*?\}\);[\s\S]*?return data;[\s\S]*?\}[\s\S]*?\}\);/,
  `
  // Calculate expense distribution locally for the selected month and year
  const rawExpenseDistribution = useMemo(() => {
    const expTxs = transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
    });
    
    const map: Record<string, number> = {};
    expTxs.forEach(tx => {
       const cat = tx.category || 'Lainnya';
       map[cat] = (map[cat] || 0) + Number(tx.amount || 0);
    });
    
    const distData = Object.keys(map).map(k => ({
       category: k,
       amount: map[k]
    }));
    
    return distData.sort((a,b) => b.amount - a.amount);
  }, [transactions, selectedMonth, selectedYear]);
  `
);

fs.writeFileSync('src/features/reports/Dashboard.tsx', code);
