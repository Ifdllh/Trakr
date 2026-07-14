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
  [/import \{ useState \} from "react";\n/g, ''],
  [/import React, \{ useState \} from "react";\n/g, ''],
  [/import \{ signInWithPopup, GoogleAuthProvider \} from "firebase\/auth";\nimport \{ googleProvider \} from "\.\.\/\.\.\/lib\/firebase";\n/g, '']
]);

replaceFile('src/components/ui/CreateMasterPeriodModal.tsx', [
  [/import \{ useState \} from 'react';\n/g, '']
]);

replaceFile('src/components/ui/FloatingActionButtons.tsx', [
  [/import \{ useState \} from 'react';\n/g, '']
]);

replaceFile('src/db/schema.ts', [
  [/import \{ relations \} from 'drizzle-orm';\n/g, '']
]);

replaceFile('src/features/budgets/BudgetManager.tsx', [
  [/import \{ useState, useMemo \} from 'react';\n/g, 'import { useMemo } from \'react\';\n'],
  [/type BudgetFormData = \{[\s\S]*?\};\n/g, '']
]);

replaceFile('src/features/reports/Dashboard.tsx', [
  [/, Transaction/g, ''],
  [/CreditCard, Copy, Check, /g, '']
]);

replaceFile('src/features/reports/GoldPriceTracker.tsx', [
  [/import \{ useState \} from 'react';\n/g, '']
]);

replaceFile('src/features/settings/Settings.tsx', [
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/features/transactions/CategoryManager.tsx', [
  [/import \{ useState, useMemo \} from 'react';\n/g, ''],
  [/BookOpen, /g, '']
]);

console.log("Done2");
