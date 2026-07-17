import re

with open('src/hooks/useAppData.ts', 'r') as f:
    data = f.read()

data = data.replace(
    "console.error('refreshData error:', err);",
    "if (!err?.message?.includes('Quota') && !err?.message?.includes('429')) console.error('refreshData error:', err);"
)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(data)

print("Done")
