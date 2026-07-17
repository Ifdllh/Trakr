import re

with open('src/features/settings/Settings.tsx', 'r') as f:
    data = f.read()

data = data.replace(
    "console.error('Failed to load user profile settings:', err);",
    "if (!err?.message?.includes('Quota') && !err?.message?.includes('429')) console.error('Failed to load user profile settings:', err);"
)

with open('src/features/settings/Settings.tsx', 'w') as f:
    f.write(data)

print("Done")
