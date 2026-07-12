import { db } from './src/db';
import { globalBudgets } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function fix() {
  await db.execute(sql`TRUNCATE TABLE global_budgets CASCADE;`);
  console.log("Truncated global_budgets");
  process.exit(0);
}
fix();
