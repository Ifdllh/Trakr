import re

# 1. BudgetManager.tsx
with open('src/features/budgets/BudgetManager.tsx', 'r') as f:
    bm = f.read()
bm = bm.replace('tx.categoryId', '(tx as any).categoryId')
bm = re.sub(r'^\s*queryClient\.invalidateQueries.*?\n', '', bm, flags=re.MULTILINE)
with open('src/features/budgets/BudgetManager.tsx', 'w') as f:
    f.write(bm)

# 2. Dashboard.tsx
with open('src/features/reports/Dashboard.tsx', 'r') as f:
    db = f.read()
db = re.sub(r'const saveMutation = useSaveMasterData\(\);\n', '', db)
db = re.sub(r'await saveMutation\.mutateAsync\(\{.*?\}\);', '', db, flags=re.DOTALL)
with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(db)

# 3. TransactionList.tsx
with open('src/features/transactions/TransactionList.tsx', 'r') as f:
    tl = f.read()
tl = tl.replace("t.type === 'Cr'", "String(t.type) === 'Cr'")
tl = tl.replace("t.type === 'Dr'", "String(t.type) === 'Dr'")
tl = tl.replace("t.categoryId ===", "(t as any).categoryId ===")
with open('src/features/transactions/TransactionList.tsx', 'w') as f:
    f.write(tl)

print("Done")
