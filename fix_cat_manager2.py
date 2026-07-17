import re

with open('src/features/transactions/CategoryManager.tsx', 'r') as f:
    data = f.read()

data = re.sub(
    r"await masterDataService\.save\('customCategories', \{ \.\.\.cat, subcategories: newSubs \}, cat\.id\);\s*onRefreshData\?\.\(\);",
    r"await onSaveMasterData('customCategories', { ...cat, subcategories: newSubs }, String(cat.id));",
    data
)

with open('src/features/transactions/CategoryManager.tsx', 'w') as f:
    f.write(data)

print("Done")
