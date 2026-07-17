import re

with open('src/features/transactions/CategoryManager.tsx', 'r') as f:
    data = f.read()

data = re.sub(r"import \{ useDeletePeriod \} from '@/features/transactions/useTransactions';\n", "", data)

with open('src/features/transactions/CategoryManager.tsx', 'w') as f:
    f.write(data)
