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
  [/import \{ signInWithPopup, GoogleAuthProvider \} from "firebase\/auth";\nimport \{ devAuth, prdAuth, googleProvider, getAuthEnv \} from "\.\.\/\.\.\/lib\/firebase";/g, 'import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";\nimport { googleProvider } from "../../lib/firebase";']
]);

replaceFile('src/components/ui/BrandLogo.tsx', [
  [/import React from 'react';\n/g, '']
]);

replaceFile('src/components/ui/CreateMasterPeriodModal.tsx', [
  [/import React, \{ useState, useEffect \} from 'react';/g, "import { useState } from 'react';"],
  [/, X/g, ""]
]);

replaceFile('src/components/ui/CreateSubCategoryModal.tsx', [
  [/Plus, /g, ""]
]);

replaceFile('src/components/ui/FloatingActionButton.tsx', [
  [/import React from 'react';\n/g, ""]
]);

replaceFile('src/components/ui/FloatingActionButtons.tsx', [
  [/import React, \{ useState \} from 'react';/g, "import { useState } from 'react';"]
]);

replaceFile('src/db/schema.ts', [
  [/, relations/g, ""]
]);

replaceFile('src/db/users.ts', [
  [/import \{ eq \} from 'drizzle-orm';\n/g, ""]
]);

replaceFile('src/features/budgets/BudgetManager.tsx', [
  [/import React, \{ useState, useMemo \} from 'react';/g, "import { useState, useMemo } from 'react';"],
  [/import \{ api \} from '@\/lib\/api';\n/g, ""]
]);

replaceFile('src/features/reports/BudgetMonitor.tsx', [
  [/import React, \{ useMemo \} from 'react';/g, "import { useMemo } from 'react';"]
]);

replaceFile('src/features/reports/Dashboard.tsx', [
  [/import \{ useQuery \} from '@tanstack\/react-query';\n/g, ""],
  [/import \{ api \} from '@\/lib\/api';\n/g, ""],
  [/, Target/g, ""],
  [/CreditCard, Copy, Check, /g, ""],
  [/ChevronDown, /g, ""],
  [/, Bell/g, ""],
  [/, ExternalLink/g, ""],
  [/, ArrowRightLeft/g, ""],
  [/, Clock/g, ""]
]);

replaceFile('src/features/reports/GoldPriceTracker.tsx', [
  [/import React, \{ useState \} from 'react';/g, "import { useState } from 'react';"]
]);

replaceFile('src/features/settings/Settings.tsx', [
  [/import React from 'react';\n/g, ""],
  [/import \{ motion \} from 'motion\/react';\n/g, ""]
]);

replaceFile('src/features/transactions/CategoryManager.tsx', [
  [/import React, \{ useState, useMemo \} from 'react';/g, "import { useState, useMemo } from 'react';"],
  [/import \{ api \} from '@\/lib\/api';\n/g, ""],
  [/, BookOpen/g, ""]
]);

replaceFile('src/features/transactions/TransactionForm.tsx', [
  [/, DollarSign/g, ""]
]);

replaceFile('src/features/transactions/TransactionList.tsx', [
  [/HelpCircle, /g, ""],
  [/ArrowUpRight, ArrowDownRight, /g, ""],
  [/, Tag/g, ""],
  [/, AlertCircle/g, ""],
  [/, Layers/g, ""]
]);

replaceFile('src/hooks/useAppData.ts', [
  [/import \{ api \} from '@\/lib\/api';\n/g, ""]
]);

replaceFile('src/utils/generateGuestData.ts', [
  [/, Category/g, ""]
]);

console.log("Done");
