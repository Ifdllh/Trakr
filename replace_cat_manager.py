import re

with open('src/features/transactions/CategoryManager.tsx', 'r') as f:
    content = f.read()

# Replace mutation creation
pattern1 = re.compile(r'  const deletePeriodMutation = useDeletePeriod\(\);\n  const \[deletingPeriodId, setDeletingPeriodId\] = useState<string \| null>\(null\);\n  const \[deleteConfirmPeriod, setDeleteConfirmPeriod\] = useState<BudgetPeriod \| null>\(null\);')
replacement1 = """  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [deleteConfirmPeriod, setDeleteConfirmPeriod] = useState<BudgetPeriod | null>(null);"""
content = re.sub(pattern1, replacement1, content)

# Replace handleDeletePeriodLogic
pattern2 = re.compile(r'  const handleDeletePeriodLogic = async \(p: BudgetPeriod\) => \{.*?setDeleteConfirmPeriod\(null\);\n      \}\n    \}\);\n  \};', re.DOTALL)
replacement2 = """  const handleDeletePeriodLogic = async (p: BudgetPeriod) => {
    setDeletingPeriodId(p.id!);
    try {
      showToast('Menghapus periode...', 'info');
      onDeletePeriod(p.id!);
      showToast(`Periode "${p.name}" berhasil dihapus!`, 'success');
      setDeletingPeriodId(null);
      setDeleteConfirmPeriod(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal menghapus periode';
      showToast(errMsg, 'error');
      setDeletingPeriodId(null);
    }
  };"""
content = re.sub(pattern2, replacement2, content)

with open('src/features/transactions/CategoryManager.tsx', 'w') as f:
    f.write(content)

print("Done")
