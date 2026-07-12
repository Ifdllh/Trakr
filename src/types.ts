export type TransactionType = 'pemasukan' | 'pengeluaran' | 'transfer';

export interface UserProfile {
  uid: string;
  email: string;
  createdAt: string;
  monthlyBudget?: number;
  categoryBudgets?: Record<string, number>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory: string;
  date: string; // Format: YYYY-MM-DD
  description: string;
  accountId: string; // Mandatory for new features
  destinationAccountId?: string;
  assetId?: string;
  tagId?: string;
  contactId?: string;
  periodId?: string;
  splitGroupId?: string;
  attachmentUrl?: string | null;
  isRecurring?: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurringEndDate?: string | null;
  createdAt: string; // ISO date-time string
}

export interface MasterAccount {
  id: string;
  accountName: string;
  accountType: 'Cash' | 'Bank' | 'E-Wallet' | 'Credit Card';
  accountNumber?: string;
  balance: number;
  initialBalance?: number;
  currentBalance?: number;
  color?: string;
  icon?: string;
  includeInNetWorth?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface MasterAsset {
  id: string;
  assetName: string;
  assetCategory: 'Gold' | 'Mutual Fund' | 'Stock';
  currentValue: number;
  isActive: boolean;
  createdAt: string;
}

export interface MasterTag {
  id: string;
  tagName: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface MasterContact {
  id: string;
  contactName: string;
  contactType: 'Payer' | 'Payee' | 'Team Member';
  isActive: boolean;
  createdAt: string;
}

export interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  isActive?: boolean;
}

export interface GlobalBudget {
  id: string;
  periodId: string;
  totalTargetAmount: number;
  createdAt?: string;
}

export interface BudgetAllocation {
  id: string;
  periodId: string;
  globalBudgetId: string;
  categoryId: string;
  type: 'amount' | 'percentage';
  value: number;
  calculatedAmount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  iconName: string; // Name of Lucide icon to load dynamically
  colorClass: string; // Tailwind color class for text and bg (e.g., 'text-amber-500 bg-amber-50')
  colorHex?: string; // Custom color in hex format
  color_hex?: string; // Custom color in hex format (snake_case database backup representation)
  subcategories: string[];
  inactiveSubcategories?: string[];
  parentCategory?: string | null;
}

// Master Data: Predefined Categories and Subcategories
export const PREDEFINED_CATEGORIES: Category[] = [
  // PENGELUARAN (Expenses)
  {
    id: 'makanan',
    name: 'Makanan & Minuman',
    type: 'pengeluaran',
    iconName: 'Utensils',
    colorClass: 'text-orange-600 bg-orange-50 border-orange-200',
    subcategories: ['Restoran', 'Kebutuhan Dapur', 'Camilan', 'Kopi & Teh', 'Makanan Cepat Saji']
  },
  {
    id: 'transportasi',
    name: 'Transportasi',
    type: 'pengeluaran',
    iconName: 'Car',
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200',
    subcategories: ['Bahan Bakar (BBM)', 'Transportasi Online', 'Servis & Perawatan', 'Parkir & Tol', 'Tiket Kereta/Pesawat']
  },
  {
    id: 'belanja',
    name: 'Belanja',
    type: 'pengeluaran',
    iconName: 'ShoppingBag',
    colorClass: 'text-purple-600 bg-purple-50 border-purple-200',
    subcategories: ['Pakaian & Aksesoris', 'Elektronik & Gadget', 'Kebutuhan Rumah Tangga', 'Hobi & Hiburan', 'Perawatan Diri']
  },
  {
    id: 'tagihan',
    name: 'Tagihan & Utilitas',
    type: 'pengeluaran',
    iconName: 'Receipt',
    colorClass: 'text-red-600 bg-red-50 border-red-200',
    subcategories: ['Listrik & Air', 'Internet & WiFi', 'Pulsa & Paket Data', 'Langganan Aplikasi (Streaming)', 'Sewa Tempat Tinggal']
  },
  {
    id: 'kesehatan',
    name: 'Kesehatan',
    type: 'pengeluaran',
    iconName: 'HeartPulse',
    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    subcategories: ['Obat-obatan', 'Konsultasi Dokter / Rumah Sakit', 'Asuransi Kesehatan', 'Suplemen & Vitamin']
  },
  {
    id: 'pendidikan',
    name: 'Pendidikan',
    type: 'pengeluaran',
    iconName: 'GraduationCap',
    colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    subcategories: ['Uang Sekolah / Kuliah', 'Buku & Alat Tulis', 'Kursus & Sertifikasi', 'Seminar & Workshop']
  },
  {
    id: 'hiburan',
    name: 'Hiburan & Sosialisasi',
    type: 'pengeluaran',
    iconName: 'Sparkles',
    colorClass: 'text-pink-600 bg-pink-50 border-pink-200',
    subcategories: ['Bioskop & Konser', 'Liburan & Travel', 'Game / Top Up', 'Kumpul Teman (Nongkrong)']
  },
  {
    id: 'lain-lain-pengeluaran',
    name: 'Lain-lain (Pengeluaran)',
    type: 'pengeluaran',
    iconName: 'HelpCircle',
    colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
    subcategories: ['Biaya Admin Bank', 'Donasi & Sedekah', 'Pengeluaran Tak Terduga', 'Pajak']
  },

  // PEMASUKAN (Incomes)
  {
    id: 'pekerjaan',
    name: 'Pekerjaan',
    type: 'pemasukan',
    iconName: 'Briefcase',
    colorClass: 'text-teal-600 bg-teal-50 border-teal-200',
    subcategories: ['Gaji Pokok', 'Bonus & THR', 'Tunjangan', 'Kerja Sampingan / Freelance']
  },
  {
    id: 'investasi',
    name: 'Investasi & Aset',
    type: 'pemasukan',
    iconName: 'TrendingUp',
    colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    subcategories: ['Dividen', 'Keuntungan Saham / Reksadana', 'Bunga Deposito', 'Imbal Hasil Obligasi', 'Sewa Properti']
  },
  {
    id: 'lain-lain-pemasukan',
    name: 'Lain-lain (Pemasukan)',
    type: 'pemasukan',
    iconName: 'Coins',
    colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    subcategories: ['Hadiah / Kado', 'Uang Jajan', 'Pengembalian Dana (Refund)', 'Penjualan Barang Bekas']
  }
];
