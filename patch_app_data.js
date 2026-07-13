import fs from 'fs';
let code = fs.readFileSync('src/hooks/useAppData.ts', 'utf8');

code = code.replace(/import \{ api \} from '@\/lib\/api';/, `import { api } from '@/lib/api';\nimport { masterDataService, transactionService } from '@/services/dbServices';`);

// Replace refreshData
code = code.replace(
  /api\.get\('\/transactions'\)/g,
  `transactionService.get()`
).replace(
  /api\.get\('\/master\/(.+?)'\)/g,
  `masterDataService.get('$1')`
);

// Replace save transaction
code = code.replace(
  /await api\.put\(\`\/transactions\/\$\{id\}\`, transactionData\);/g,
  `await transactionService.save(transactionData, id);`
).replace(
  /await api\.post\('\/transactions', transactionData\);/g,
  `await transactionService.save(transactionData);`
);

// Replace delete transaction
code = code.replace(
  /await api\.delete\(\`\/transactions\/\$\{id\}\`\);/g,
  `await transactionService.delete(id);`
);

// Replace handleSaveMasterData
code = code.replace(
  /await api\.put\(\`\/master\/\$\{collectionName\}\/\$\{id\}\`, data\);/g,
  `await masterDataService.save(collectionName, data, id);`
).replace(
  /const res = await api\.post\(\`\/master\/\$\{collectionName\}\`, data\);/g,
  `const res = await masterDataService.save(collectionName, data);`
);

// Replace handleDeleteMasterData
code = code.replace(
  /await api\.delete\(\`\/master\/\$\{collectionName\}\/\$\{id\}\`\);/g,
  `await masterDataService.delete(collectionName, id);`
);

// Replace periods
code = code.replace(
  /await api\.put\(\`\/master\/periods\/\$\{id\}\`, data\);/g,
  `await masterDataService.save('periods', data, id);`
).replace(
  /await api\.post\('\/master\/periods', data\);/g,
  `await masterDataService.save('periods', data);`
).replace(
  /await api\.delete\(\`\/master\/periods\/\$\{id\}\`\);/g,
  `await masterDataService.delete('periods', id);`
);

// Replace budgets
code = code.replace(
  /await api\.put\(\`\/master\/budgets\/\$\{id\}\`, allocation\);/g,
  `await masterDataService.save('budgets', allocation, id);`
).replace(
  /await api\.post\('\/master\/budgets', allocation\);/g,
  `await masterDataService.save('budgets', allocation);`
).replace(
  /await api\.put\(\`\/master\/globalBudgets\/\$\{id\}\`, globalBudget\);/g,
  `await masterDataService.save('globalBudgets', globalBudget, id);`
).replace(
  /await api\.post\('\/master\/globalBudgets', globalBudget\);/g,
  `await masterDataService.save('globalBudgets', globalBudget);`
).replace(
  /await api\.delete\(\`\/master\/budgets\/\$\{id\}\`\);/g,
  `await masterDataService.delete('budgets', id);`
);

fs.writeFileSync('src/hooks/useAppData.ts', code);
