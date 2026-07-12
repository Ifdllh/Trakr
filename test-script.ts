import { db } from './src/db/index.js';
import { masterAccounts } from './src/db/schema.js';
async function run() {
  const accounts = await db.select().from(masterAccounts);
  console.log("DIRECT ACCOUNTS:", accounts);
  
  const tableMap: Record<string, any> = { 'accounts': masterAccounts };
  const dynamicAccounts = await db.select().from(tableMap['accounts']);
  console.log("DYNAMIC ACCOUNTS:", dynamicAccounts);
}
run();
