import re
with open('src/features/budgets/BudgetManager.tsx', 'r') as f:
    bm = f.read()
bm = bm.replace("String(t.categoryId)", "String((t as any).categoryId)")
with open('src/features/budgets/BudgetManager.tsx', 'w') as f:
    f.write(bm)

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    db = f.read()
db = re.sub(r'const saveMutation = useSaveMasterData\(\);\n', '', db)
db = re.sub(r'await saveMutation\.mutateAsync\([^)]+\);', '', db, flags=re.DOTALL)
db = re.sub(r'useSaveMasterData', '', db)
with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(db)

print("Done")
