import re

with open('src/components/ui/CreateMasterAccountModal.tsx', 'r') as f:
    data = f.read()

data = re.sub(r"import \{ useQueryClient \} from '@tanstack/react-query';\n", "", data)
data = re.sub(r"  const queryClient = useQueryClient\(\);\n", "", data)

with open('src/components/ui/CreateMasterAccountModal.tsx', 'w') as f:
    f.write(data)
