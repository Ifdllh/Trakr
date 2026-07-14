import fs from 'fs';

let routes = fs.readFileSync('routes.ts', 'utf8');

const newMap = `const getTable = (collectionName: string) => {
  const map: Record<string, any> = {
    'customCategories': schema.masterCategories,
    'customAccounts': schema.masterAccounts,
    'accounts': schema.masterAccounts,
    'customContacts': schema.masterContacts,
    'contacts': schema.masterContacts,
    'customTags': schema.masterTags,
    'tags': schema.masterTags,
    'customPeriods': schema.masterPeriods,
    'periods': schema.masterPeriods,
    'customAssets': schema.masterAssets,
    'assets': schema.masterAssets,
    'budgetAllocations': schema.budgetAllocations,
    'budgets': schema.budgetAllocations,
    'transactions': schema.transactions,
    'globalBudgets': schema.globalBudgets
  };
  return map[collectionName];
};`;

routes = routes.replace(/const getTable = \(collectionName: string\) => \{[\s\S]*?return map\[collectionName\];\n\};/m, newMap);

fs.writeFileSync('routes.ts', routes);
