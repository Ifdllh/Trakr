import re

with open('src/features/transactions/CategoryManager.tsx', 'r') as f:
    content = f.read()

content = content.replace("deletePeriodMutation.isPending && deletingPeriodId === p.id", "deletingPeriodId === p.id")
content = content.replace("deletePeriodMutation.isPending", "deletingPeriodId !== null")

with open('src/features/transactions/CategoryManager.tsx', 'w') as f:
    f.write(content)

print("Done")
