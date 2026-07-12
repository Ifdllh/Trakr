import { db } from './src/db';
import { globalBudgets, budgetAllocations } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  await db.delete(budgetAllocations);
  await db.delete(globalBudgets);
  console.log("Deleted all global_budgets and allocations");
  process.exit(0);
}
fix();
