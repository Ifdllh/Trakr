import re

with open('src/hooks/useAppData.ts', 'r') as f:
    data = f.read()

data = re.sub(r"import \{ useQueryClient \} from '@tanstack/react-query';\n", "", data)
data = re.sub(r"  const queryClient = useQueryClient\(\);\n", "", data)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(data)

print("Done")
