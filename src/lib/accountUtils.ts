import { MasterAccount, Transaction, Category } from '@/types';
import { masterDataService } from '@/services/dbServices';

/**
 * Calculates dynamic current balance for accounts based on historical transactions.
 * Formula: Current Balance = Initial Balance + (Sum of Income Transactions) - (Sum of Expense Transactions)
 */
export function calculateAccountsWithBalance(
  accounts: MasterAccount[],
  transactions: Transaction[]
): MasterAccount[] {
  if (!accounts || accounts.length === 0) return [];
  const txList = transactions || [];

  return accounts.map(acc => {
    const accIdStr = String(acc.id);
    
    // Determine the base initial balance
    const initial = acc.initialBalance !== undefined 
      ? acc.initialBalance 
      : (acc.balance !== undefined ? acc.balance : 0);

    let totalIncome = 0;
    let totalExpense = 0;

    txList.forEach((t: any) => {
      const txAccountId = t.accountId ? String(t.accountId) : null;
      const txDestAccountId = t.destinationAccountId ? String(t.destinationAccountId) : null;
      const amount = Number(t.amount || 0);
      const txType = String(t.type || '').toLowerCase();

      // Transactions originating from this account
      if (txAccountId === accIdStr) {
        if (txType === 'pemasukan' || txType === 'cr' || txType === 'income') {
          totalIncome += amount;
        } else if (txType === 'pengeluaran' || txType === 'dr' || txType === 'expense' || txType === 'transfer') {
          totalExpense += amount;
        }
      }

      // Transfer transactions where this account is the destination
      if (txDestAccountId === accIdStr && txType === 'transfer') {
        totalIncome += amount;
      }
    });

    const currentBalance = Number(initial || 0) + totalIncome - totalExpense;

    return {
      ...acc,
      initialBalance: Number(initial || 0),
      balance: currentBalance,
      currentBalance: currentBalance
    };
  });
}

/**
 * Upserts system category and subcategory into Master Data (customCategories) if they don't exist.
 * Ensures relational integrity so ghost categories are eliminated.
 */
export async function upsertSavingsCategory({
  categoryName,
  subcategoryName,
  type,
  categories = [],
  customCategories = [],
  onSaveMasterData
}: {
  categoryName: string;
  subcategoryName: string;
  type: 'pemasukan' | 'pengeluaran';
  categories?: Category[];
  customCategories?: any[];
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
}): Promise<{ category: string; subcategory: string }> {
  const saveFunc = async (collName: string, data: any, id?: string) => {
    if (onSaveMasterData) {
      return await onSaveMasterData(collName, data, id);
    } else {
      return await masterDataService.save(collName, data, id);
    }
  };

  const normType = type.toLowerCase();
  const targetCatName = categoryName.trim();
  const targetSubName = (subcategoryName || '').trim();

  // Find if parent category already exists in merged categories
  const existingCat = categories.find(
    c => (c.name || '').trim().toLowerCase() === targetCatName.toLowerCase() &&
         (c.type || '').trim().toLowerCase() === normType
  );

  const iconName = 'PiggyBank';
  const colorClass = normType === 'pemasukan' 
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-indigo-600 bg-indigo-50 border-indigo-200';
  const colorHex = normType === 'pemasukan' ? '#10b981' : '#4f46e5';

  if (!existingCat) {
    // 1. Parent category does NOT exist -> Create parent category with subcategory in customCategories
    await saveFunc('customCategories', {
      name: targetCatName,
      type: normType,
      iconName: iconName,
      colorClass: colorClass,
      colorHex: colorHex,
      color_hex: colorHex,
      isSavings: true,
      parentCategory: null,
      subcategories: targetSubName ? [targetSubName] : [],
      isActive: true
    });
  } else {
    // 2. Parent category exists. Check if subcategory exists
    const currentSubs = existingCat.subcategories || [];
    const hasSub = currentSubs.some(s => (s || '').trim().toLowerCase() === targetSubName.toLowerCase());

    if (targetSubName && !hasSub) {
      // Save subcategory link entry
      await saveFunc('customCategories', {
        name: targetSubName,
        parentCategory: targetCatName,
        type: normType,
        iconName: iconName,
        colorClass: colorClass,
        colorHex: colorHex,
        color_hex: colorHex,
        isSavings: true,
        subcategories: [],
        isActive: true
      });

      // If parent category is a custom category document, also update its subcategories array
      const customParentDoc = customCategories.find(
        c => (c.name || '').trim().toLowerCase() === targetCatName.toLowerCase() &&
             (c.type || '').trim().toLowerCase() === normType &&
             !c.parentCategory
      );

      if (customParentDoc && customParentDoc.id) {
        const updatedSubs = Array.from(new Set([...(customParentDoc.subcategories || []), targetSubName]));
        await saveFunc('customCategories', {
          ...customParentDoc,
          subcategories: updatedSubs
        }, String(customParentDoc.id));
      }
    }
  }

  return {
    category: targetCatName,
    subcategory: targetSubName
  };
}

/**
 * Upserts Net Worth / Balance Adjustment category and subcategory into Master Data (customCategories)
 * if they don't exist. Ensures relational integrity so adjustment transactions appear in Master Data.
 */
export async function upsertAdjustmentCategory({
  type,
  categories = [],
  customCategories = [],
  onSaveMasterData
}: {
  type: 'pemasukan' | 'pengeluaran';
  categories?: Category[];
  customCategories?: any[];
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
}): Promise<{ category: string; subcategory: string }> {
  const saveFunc = async (collName: string, data: any, id?: string) => {
    if (onSaveMasterData) {
      return await onSaveMasterData(collName, data, id);
    } else {
      return await masterDataService.save(collName, data, id);
    }
  };

  const normType = type.toLowerCase() as 'pemasukan' | 'pengeluaran';
  const targetCatName = 'Penyesuaian Saldo';
  const targetSubName = normType === 'pemasukan' ? 'Koreksi Pemasukan' : 'Koreksi Pengeluaran';

  const iconName = 'SlidersHorizontal';
  const colorClass = normType === 'pemasukan' 
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-rose-600 bg-rose-50 border-rose-200';
  const colorHex = normType === 'pemasukan' ? '#10b981' : '#f43f5e';

  // Find if parent category exists in categories
  const existingCat = categories.find(
    c => (c.name || '').trim().toLowerCase() === targetCatName.toLowerCase() &&
         (c.type || '').trim().toLowerCase() === normType
  );

  if (!existingCat) {
    // 1. Parent category does NOT exist in custom or default -> Create in customCategories
    await saveFunc('customCategories', {
      name: targetCatName,
      type: normType,
      iconName: iconName,
      colorClass: colorClass,
      colorHex: colorHex,
      color_hex: colorHex,
      parentCategory: null,
      subcategories: [targetSubName],
      isActive: true
    });
  } else {
    // 2. Parent category exists. Ensure subcategory is linked
    const currentSubs = existingCat.subcategories || [];
    const hasSub = currentSubs.some(s => (s || '').trim().toLowerCase() === targetSubName.toLowerCase());

    if (!hasSub) {
      await saveFunc('customCategories', {
        name: targetSubName,
        parentCategory: targetCatName,
        type: normType,
        iconName: iconName,
        colorClass: colorClass,
        colorHex: colorHex,
        color_hex: colorHex,
        subcategories: [],
        isActive: true
      });

      const customParentDoc = customCategories.find(
        c => (c.name || '').trim().toLowerCase() === targetCatName.toLowerCase() &&
             (c.type || '').trim().toLowerCase() === normType &&
             !c.parentCategory
      );

      if (customParentDoc && customParentDoc.id) {
        const updatedSubs = Array.from(new Set([...(customParentDoc.subcategories || []), targetSubName]));
        await saveFunc('customCategories', {
          ...customParentDoc,
          subcategories: updatedSubs
        }, String(customParentDoc.id));
      }
    }
  }

  return {
    category: targetCatName,
    subcategory: targetSubName
  };
}

