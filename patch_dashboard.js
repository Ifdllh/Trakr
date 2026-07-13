import fs from 'fs';

let code = fs.readFileSync('src/features/reports/Dashboard.tsx', 'utf8');

// The original uses a fetchStats block
const fetchStatsReplacement = `
    const fetchStats = async () => {
      if (!user) return;
      try {
        setLoadingStats(true);
        
        // Calculate locally from transactions array instead of backend API
        const filteredTxs = activePeriodId 
          ? transactions.filter(t => t.periodId === activePeriodId)
          : transactions;
          
        const totalIncome = filteredTxs
          .filter(t => t.type === 'Cr' || t.type?.toLowerCase() === 'pemasukan')
          .reduce((sum, t) => sum + Number(t.amount), 0);
          
        const totalExpense = filteredTxs
          .filter(t => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran')
          .reduce((sum, t) => sum + Number(t.amount), 0);
          
        setCashflowStats({
          totalIncome,
          totalExpense,
          netIncome: totalIncome - totalExpense
        });
        
        // Calculate distribution
        const expTxs = filteredTxs.filter(t => t.type === 'Dr' || t.type?.toLowerCase() === 'pengeluaran');
        const map = {};
        expTxs.forEach(tx => {
           const cat = tx.category || 'Lainnya';
           map[cat] = (map[cat] || 0) + Number(tx.amount);
        });
        
        const distData = Object.keys(map).map(k => ({
           category: k,
           amount: map[k],
           color: '#6366F1'
        }));
        
        // Assign colors dynamically for top items
        const colors = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6'];
        distData.sort((a,b) => b.amount - a.amount).forEach((d, i) => {
           if (i < colors.length) d.color = colors[i];
        });
        
        setExpenseDistribution(distData);
        setLoadingStats(false);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
        setLoadingStats(false);
      }
    };
`;

// Replace the old fetchStats block
code = code.replace(/const fetchStats = async \(\) => \{[\s\S]*?setLoadingStats\(false\);\n      \}\n    \};/, fetchStatsReplacement.trim());

fs.writeFileSync('src/features/reports/Dashboard.tsx', code);
