import re

with open('src/App.tsx', 'r') as f:
    data = f.read()

data = data.replace(
    "console.error('Failed to fetch Firestore user profile in App:', err);",
    "if (!err?.message?.includes('Quota')) console.error('Failed to fetch Firestore user profile in App:', err);"
)

with open('src/App.tsx', 'w') as f:
    f.write(data)

print("Done")
