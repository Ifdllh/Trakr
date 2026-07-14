import fs from 'fs';

let content = fs.readFileSync('src/features/budgets/BudgetManager.tsx', 'utf8');

content = content.replace(/const currentExpenses = useMemo\(\(\) => \{[\s\S]*?\}, \[transactions, selectedPeriod\]\);\n/g, '');
content = content.replace(/getValues, /g, '');

fs.writeFileSync('src/features/budgets/BudgetManager.tsx', content);
