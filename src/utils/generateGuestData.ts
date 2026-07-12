import { Transaction, BudgetAllocation, BudgetPeriod, GlobalBudget, MasterAccount, Category } from '../types';

/**
 * Generates an array of randomized yet realistic dummy transactions for a specified month/year.
 */
export function generateGuestTransactions(month: number, year: number): Transaction[] {
  const transactions: Transaction[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let idCounter = 10000;

  // Helper to get random number in range
  const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Helper to format date as YYYY-MM-DD
  const formatDate = (day: number) => {
    const mm = month < 10 ? `0${month}` : `${month}`;
    const dd = day < 10 ? `0${day}` : `${day}`;
    return `${year}-${mm}-${dd}`;
  };

  // 1. Pemasukan (Income): 1-2 transactions (e.g. Gaji, Bonus)
  const incomeCount = randomRange(1, 2);
  for (let i = 0; i < incomeCount; i++) {
    const day = randomRange(1, 5); // Usually at start of month
    const amount = randomRange(8000000, 15000000);
    const subcategory = i === 0 ? 'Gaji Pokok' : 'Bonus & THR';
    const dateStr = formatDate(day);
    
    transactions.push({
      id: (++idCounter).toString(),
      type: 'pemasukan',
      amount,
      category: 'pekerjaan',
      subcategory,
      date: dateStr,
      description: i === 0 ? 'Gaji Bulanan' : 'Bonus Proyek Sampingan',
      accountId: 'bank_bca',
      createdAt: new Date(`${dateStr}T09:00:00Z`).toISOString()
    });
  }

  // 2. Makanan & Minuman: 15-20 transactions (Rp 20.000 - Rp 150.000)
  const foodCount = randomRange(15, 20);
  const foodSubs = ['Restoran', 'Camilan', 'Kopi & Teh', 'Makanan Cepat Saji', 'Kebutuhan Dapur'];
  const foodDescs = [
    'Makan Siang Nasi Padang', 'Kopi Susu Senja', 'Camilan Sore Minimarket', 
    'Gojek Burger', 'Beli Sayur & Buah Pasar', 'Makan Malam bersama Keluarga',
    'Roti Bakar Bandung', 'Es Kopi Susu Gula Aren', 'Belanja Bulanan Supermarket'
  ];
  for (let i = 0; i < foodCount; i++) {
    const day = randomRange(1, daysInMonth);
    const amount = randomRange(20000, 150000);
    const subcategory = foodSubs[randomRange(0, foodSubs.length - 1)];
    const description = foodDescs[randomRange(0, foodDescs.length - 1)];
    const dateStr = formatDate(day);
    const accountId = randomRange(1, 3) === 1 ? 'cash' : (randomRange(1, 2) === 1 ? 'bank_bca' : 'e_wallet');

    transactions.push({
      id: (++idCounter).toString(),
      type: 'pengeluaran',
      amount,
      category: 'makanan',
      subcategory,
      date: dateStr,
      description,
      accountId,
      createdAt: new Date(`${dateStr}T${randomRange(10, 21)}:30:00Z`).toISOString()
    });
  }

  // 3. Transportasi: 10-15 transactions (Rp 10.000 - Rp 50.000)
  const transCount = randomRange(10, 15);
  const transSubs = ['Transportasi Online', 'Bahan Bakar (BBM)', 'Parkir & Tol'];
  const transDescs = [
    'Ojek Online ke Kantor', 'Isi Pertalite Motor', 'Ojek Online Pulang Kantor',
    'Parkir Mall', 'Biaya Tol Dalam Kota', 'Grab Car ke Stasiun'
  ];
  for (let i = 0; i < transCount; i++) {
    const day = randomRange(1, daysInMonth);
    const amount = randomRange(10000, 50000);
    const subcategory = transSubs[randomRange(0, transSubs.length - 1)];
    const description = transDescs[randomRange(0, transDescs.length - 1)];
    const dateStr = formatDate(day);
    const accountId = subcategory === 'Parkir & Tol' ? 'cash' : 'e_wallet';

    transactions.push({
      id: (++idCounter).toString(),
      type: 'pengeluaran',
      amount,
      category: 'transportasi',
      subcategory,
      date: dateStr,
      description,
      accountId,
      createdAt: new Date(`${dateStr}T${randomRange(8, 18)}:15:00Z`).toISOString()
    });
  }

  // 4. Hiburan & Sosialisasi: 3-5 transactions (Rp 50.000 - Rp 300.000)
  const entCount = randomRange(3, 5);
  const entSubs = ['Bioskop & Konser', 'Liburan & Travel', 'Kumpul Teman (Nongkrong)'];
  const entDescs = [
    'Nonton Film Bioskop XXI', 'Nongkrong Akhir Pekan', 'Langganan Netflix',
    'Beli Game Steam Sale', 'Makan Bareng Teman Kantor'
  ];
  for (let i = 0; i < entCount; i++) {
    const day = randomRange(1, daysInMonth);
    const amount = randomRange(50000, 300000);
    const subcategory = entSubs[randomRange(0, entSubs.length - 1)];
    const description = entDescs[randomRange(0, entDescs.length - 1)];
    const dateStr = formatDate(day);
    const accountId = 'bank_bca';

    transactions.push({
      id: (++idCounter).toString(),
      type: 'pengeluaran',
      amount,
      category: 'hiburan',
      subcategory,
      date: dateStr,
      description,
      accountId,
      createdAt: new Date(`${dateStr}T${randomRange(14, 22)}:00:00Z`).toISOString()
    });
  }

  // Sort descending by date and then by ID (for consistent display)
  return transactions.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/**
 * Dynamically constructs the Budget limits based on generated transactions.
 * Sets the 'Target Budget' to be spent * random factor between 0.8 to 1.3.
 */
export function generateGuestBudgets(transactions: Transaction[]): {
  periods: BudgetPeriod[];
  globalBudgets: GlobalBudget[];
  allocations: BudgetAllocation[];
} {
  const periodId = 'guest_period';
  const globalBudgetId = 'guest_global_budget';

  // 1. Define active Period
  const activePeriod: BudgetPeriod = {
    id: periodId,
    name: 'Periode Tamu (Uji Coba)',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    createdAt: new Date().toISOString(),
    isActive: true
  };

  // 2. Sum spending per category
  const spendingByCategory: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'pengeluaran') {
      spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
    }
  });

  // 3. Create Budget Allocations with randomized buffer factors (0.8 to 1.3)
  const allocations: BudgetAllocation[] = [];
  let totalTargetAmount = 0;
  let idCounter = 20000;

  Object.entries(spendingByCategory).forEach(([category, spent]) => {
    // Generate a random factor between 0.8 and 1.3
    const factor = 0.8 + Math.random() * 0.5;
    // Round to nearest 10.000 for realistic limits
    const calculatedAmount = Math.round((spent * factor) / 10000) * 10000;
    totalTargetAmount += calculatedAmount;

    allocations.push({
      id: (++idCounter).toString(),
      periodId,
      globalBudgetId,
      categoryId: category,
      type: 'amount',
      value: calculatedAmount,
      calculatedAmount,
      createdAt: new Date().toISOString()
    });
  });

  // 4. Create Global Budget
  const globalBudget: GlobalBudget = {
    id: globalBudgetId,
    periodId,
    totalTargetAmount: totalTargetAmount || 1500000,
    createdAt: new Date().toISOString()
  };

  return {
    periods: [activePeriod],
    globalBudgets: [globalBudget],
    allocations
  };
}

/**
 * Generates default Mock Master Accounts for guest mode.
 */
export function generateGuestAccounts(): MasterAccount[] {
  return [
    {
      id: 'cash',
      accountName: 'Dompet Tunai (Cash)',
      accountType: 'Cash',
      balance: 450000,
      isActive: true,
      includeInNetWorth: true,
      color: '#10B981', // emerald
      createdAt: new Date().toISOString()
    },
    {
      id: 'bank_bca',
      accountName: 'Rekening Bank BCA',
      accountType: 'Bank',
      balance: 12450000,
      isActive: true,
      includeInNetWorth: true,
      color: '#3B82F6', // blue
      createdAt: new Date().toISOString()
    },
    {
      id: 'e_wallet',
      accountName: 'GoPay / OVO Wallet',
      accountType: 'E-Wallet',
      balance: 850000,
      isActive: true,
      includeInNetWorth: true,
      color: '#8B5CF6', // purple
      createdAt: new Date().toISOString()
    }
  ];
}
