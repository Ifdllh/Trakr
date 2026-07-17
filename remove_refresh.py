import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

# Replace refreshData(); followed by optional comments
content = re.sub(r'^\s*refreshData\(\);(?: // background)?\s*\n', '', content, flags=re.MULTILINE)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
