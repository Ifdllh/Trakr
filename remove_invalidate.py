import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

# Replace queryClient.invalidateQueries calls
content = re.sub(r'^\s*queryClient\.invalidateQueries.*?\n', '', content, flags=re.MULTILINE)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
