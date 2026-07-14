import fs from 'fs';

let useTx = fs.readFileSync('src/features/transactions/useTransactions.ts', 'utf8');
useTx = useTx.replace(/let data = await transactionService\.get\(\);\s*if \(filters\)/g, "let data = await transactionService.get();\n      if (!Array.isArray(data)) data = [];\n\n      if (filters)");
fs.writeFileSync('src/features/transactions/useTransactions.ts', useTx);
