import fs from 'fs';

function replaceFile(path, regexes) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (const [regex, replacement] of regexes) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(path, content);
}

replaceFile('src/components/ui/Auth.tsx', [
  [/import React from 'react';\n/g, ''],
  [/import \{ devAuth, prdAuth, getAuthEnv \} from "\.\.\/\.\.\/lib\/firebase";\n/g, '']
]);

replaceFile('src/components/ui/CreateMasterPeriodModal.tsx', [
  [/import React, \{ useEffect \} from 'react';\n/g, ''],
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/components/ui/FloatingActionButtons.tsx', [
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/features/budgets/BudgetManager.tsx', [
  [/import React from 'react';\n/g, ''],
  [/type BudgetFormData = [\s\S]*?;\n/g, ''] // removing type BudgetFormData
]);

replaceFile('src/features/reports/Dashboard.tsx', [
  [/CreditCard, Copy, Check, /g, '']
]);

replaceFile('src/features/reports/GoldPriceTracker.tsx', [
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/features/settings/Settings.tsx', [
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/features/transactions/CategoryManager.tsx', [
  [/import React from 'react';\n/g, '']
]);

console.log("Imports cleaned.");
