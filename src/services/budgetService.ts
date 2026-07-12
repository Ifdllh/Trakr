import { db } from "../db/index";
import { transactions, masterCategories } from "../db/schema";
import { and, eq, or, gte, lte } from "drizzle-orm";
import { PREDEFINED_CATEGORIES } from "../types";

export interface SuggestedBudget {
  category_id: string | number;
  name: string;
  suggested_amount: number;
}

export async function calculateSuggestedBudgets(
  userId: number,
  targetMonth: number,
  targetYear: number
): Promise<SuggestedBudget[]> {
  // Calculate preceding 3 complete months date range
  // e.g., if target is 01-2026 (Jan 2026), the 3 months are 10-2025, 11-2025, 12-2025.
  const startDate = new Date(targetYear, targetMonth - 1 - 3, 1);
  const endDate = new Date(targetYear, targetMonth - 1, 0); // last day of preceding month

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startStr = format(startDate);
  const endStr = format(endDate);

  // Query transactions in that range
  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(
          eq(transactions.type, "pengeluaran"),
          eq(transactions.type, "Pengeluaran")
        ),
        gte(transactions.date, startStr),
        lte(transactions.date, endStr)
      )
    );

  // Query custom categories for mapping
  const customCats = await db
    .select()
    .from(masterCategories)
    .where(
      and(
        eq(masterCategories.userId, userId),
        eq(masterCategories.isActive, true)
      )
    );

  // Create Category lookup map: Name -> ID
  const categoryMap = new Map<string, string | number>();
  
  PREDEFINED_CATEGORIES.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  });

  customCats.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  });

  // Group transactions by category_id and collect unique months present
  const totalAmountByCat = new Map<string | number, number>();
  const monthsByCat = new Map<string | number, Set<string>>();

  txs.forEach((tx) => {
    const catNameNormalized = (tx.category || "").trim().toLowerCase();
    const catId = categoryMap.get(catNameNormalized) || "lainnya";

    const currentTotal = totalAmountByCat.get(catId) || 0;
    totalAmountByCat.set(catId, currentTotal + (tx.amount || 0));

    const txMonth = (tx.date || "").substring(0, 7); // e.g. "2025-10"
    if (txMonth && txMonth.length === 7) {
      if (!monthsByCat.has(catId)) {
        monthsByCat.set(catId, new Set<string>());
      }
      monthsByCat.get(catId)!.add(txMonth);
    }
  });

  const categoryNames = new Map<string | number, string>();
  PREDEFINED_CATEGORIES.forEach((cat) => {
    categoryNames.set(cat.id, cat.name);
  });
  customCats.forEach((cat) => {
    categoryNames.set(cat.id, cat.name);
  });
  categoryNames.set("lainnya", "Lainnya");

  const suggestions: SuggestedBudget[] = [];

  totalAmountByCat.forEach((totalAmount, catId) => {
    const uniqueMonths = monthsByCat.get(catId);
    const activeMonthsCount = uniqueMonths ? uniqueMonths.size : 1;
    
    const divisor = activeMonthsCount > 0 ? activeMonthsCount : 1;
    const averageAmount = Math.round(totalAmount / divisor);

    suggestions.push({
      category_id: catId,
      name: categoryNames.get(catId) || String(catId),
      suggested_amount: averageAmount
    });
  });

  return suggestions;
}
