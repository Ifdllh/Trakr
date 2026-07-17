import re

with open('src/features/transactions/TransactionForm.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = re.sub(r"import \{ useGetMasterData \} from '@/services/useMasterData';\n", "", content)
content = re.sub(r"import \{ useCreateTransaction \} from '@/features/transactions/useTransactions';\n", "", content)

# Modify Props
props_target = re.compile(r"interface TransactionFormProps \{\n  categories: Category\[\];\n  onSave: \(transaction: Omit<Transaction, 'id' \| 'createdAt'> \| Omit<Transaction, 'id' \| 'createdAt'>\[\], id\?: string\) => Promise<void>;\n  onClose: \(\) => void;\n  transactionToEdit\?: Transaction \| null;\n  initialType\?: TransactionType;\n  accounts\?: MasterAccount\[\];\n  assets\?: MasterAsset\[\];\n  tags\?: MasterTag\[\];\n  contacts\?: MasterContact\[\];\n  onSaveMasterData\?: \(collectionName: string, data: any, id\?: string\) => Promise<string \| void>;\n\}")
props_replace = """interface TransactionFormProps {
  categories: Category[];
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'> | Omit<Transaction, 'id' | 'createdAt'>[], id?: string) => Promise<void>;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  initialType?: TransactionType;
  accounts?: MasterAccount[];
  assets?: MasterAsset[];
  tags?: MasterTag[];
  contacts?: MasterContact[];
  onSaveMasterData?: (collectionName: string, data: any, id?: string) => Promise<string | void>;
  periods?: any[];
}"""
content = re.sub(props_target, props_replace, content)

# Modify Signature
sig_target = re.compile(r"export default function TransactionForm\(\{ \n  categories, onSave, onClose, transactionToEdit, initialType,\n  accounts = \[\], assets = \[\], tags = \[\], contacts = \[\], onSaveMasterData\n\}: TransactionFormProps\) \{")
sig_replace = """export default function TransactionForm({ 
  categories, onSave, onClose, transactionToEdit, initialType,
  accounts = [], assets = [], tags = [], contacts = [], onSaveMasterData, periods = []
}: TransactionFormProps) {"""
content = re.sub(sig_target, sig_replace, content)

# Remove hook
hook_target = re.compile(r"  const isCreating = false;\n  const \{ data: periods = \[\] \} = useGetMasterData\('periods'\);\n  const \[matchedPeriod, setMatchedPeriod\] = useState<any>\(null\);")
hook_replace = """  const isCreating = false;
  const [matchedPeriod, setMatchedPeriod] = useState<any>(null);"""
content = re.sub(hook_target, hook_replace, content)

with open('src/features/transactions/TransactionForm.tsx', 'w') as f:
    f.write(content)

print("Done")
