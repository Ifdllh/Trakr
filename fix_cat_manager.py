import re

with open('src/features/transactions/CategoryManager.tsx', 'r') as f:
    data = f.read()

# Replace handleDeleteSubcategory
data = data.replace(
"""        await masterDataService.save('customCategories', { ...cat, subcategories: newSubs }, cat.id);  
        onRefreshData?.();""",
"""        await onSaveMasterData('customCategories', { ...cat, subcategories: newSubs }, cat.id);"""
)

# Replace handleRenameSubcategory
data = data.replace(
"""        await masterDataService.save('customCategories', { ...cat, subcategories: newSubs }, cat.id);  
        onRefreshData?.();""",
"""        await onSaveMasterData('customCategories', { ...cat, subcategories: newSubs }, cat.id);"""
)

with open('src/features/transactions/CategoryManager.tsx', 'w') as f:
    f.write(data)

print("Done")
