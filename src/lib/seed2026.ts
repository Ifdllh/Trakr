import { api } from './api';
import { PREDEFINED_CATEGORIES } from '../types';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function seed2026Data(onProgress: (msg: string) => void) {
  onProgress('Memulai populate data 2026...');
  try {
    const pemasukanCats = PREDEFINED_CATEGORIES.filter(c => c.type === 'pemasukan');
    const pengeluaranCats = PREDEFINED_CATEGORIES.filter(c => c.type === 'pengeluaran');

    for (let month = 1; month <= 12; month++) {
      onProgress(`Membuat data periode dan anggaran bulan ${month}/2026...`);
      const monthStr = month.toString().padStart(2, '0');
      
      // 1. Create Period
      const startDate = new Date(2026, month - 1, 1).toISOString();
      const endDate = new Date(2026, month, 0).toISOString(); // Last day of month
      
      const periodRes = await api.post('/masterdata/periods', {
        name: `Bulan ${monthStr} 2026`,
        startDate: startDate,
        endDate: endDate,
        createdAt: new Date().toISOString()
      });
      await sleep(100);
      const periodId = periodRes.data.id;

      // 2. Create Global Budget
      const totalBudgetAmount = getRandomInt(6000000, 10000000);
      const globalBudgetRes = await api.post('/masterdata/globalBudgets', {
        periodId: periodId,
        totalTargetAmount: totalBudgetAmount,
        createdAt: new Date().toISOString()
      });
      await sleep(100);
      const globalBudgetId = globalBudgetRes.data.id;

      // 3. Create Budget Allocations
      // Allocate budget to 3-5 random categories
      const numAllocations = getRandomInt(3, 5);
      const shuffledExpenseCats = [...pengeluaranCats].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < numAllocations; i++) {
        const cat = shuffledExpenseCats[i];
        const value = getRandomInt(1000000, 2000000); // 1-2 million per category
        
        await api.post('/masterdata/budgets', {
          periodId: periodId,
          globalBudgetId: globalBudgetId,
          categoryId: cat.id,
          type: 'amount',
          value: value,
          calculatedAmount: value,
          createdAt: new Date().toISOString()
        });
        await sleep(100);
      }

      onProgress(`Membuat transaksi bulan ${month}/2026...`);
      
      // 1 pemasukan per bulan
      const gajiDate = new Date(2026, month - 1, getRandomInt(1, 5)).toISOString();
      const pekerjaanCat = pemasukanCats.find(c => c.id === 'pekerjaan') || pemasukanCats[0];
      await api.post('/transactions', {
        type: 'pemasukan',
        amount: getRandomInt(10000000, 15000000),
        category: pekerjaanCat.name,
        date: gajiDate,
        periodId: periodId,
        createdAt: new Date().toISOString()
      });
      await sleep(100);
      
      // 10-15 pengeluaran per bulan
      const numExpenses = getRandomInt(10, 15);
      for (let i = 0; i < numExpenses; i++) {
        const expenseDate = new Date(2026, month - 1, getRandomInt(1, 28)).toISOString();
        const cat = pengeluaranCats[getRandomInt(0, pengeluaranCats.length - 1)];
        await api.post('/transactions', {
          type: 'pengeluaran',
          amount: getRandomInt(50000, 500000),
          category: cat.name,
          date: expenseDate,
          periodId: periodId,
          createdAt: new Date().toISOString(),
          description: `Pengeluaran ${cat.name}`
        });
        await sleep(100);
      }
      onProgress(`Bulan ${month}/2026 selesai...`);
    }
    
    onProgress('Populate data selesai!');
  } catch (error: any) {
    onProgress('Error: ' + error.message);
  }
}
