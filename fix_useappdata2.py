import re

with open('src/hooks/useAppData.ts', 'r') as f:
    data = f.read()

data = re.sub(
    r"    setLoadingData\(true\);\n  \}, \[user, refreshData\]\);",
    r"    setLoadingData(true);\n    refreshData();\n  }, [user, refreshData]);",
    data
)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(data)

print("Done")
