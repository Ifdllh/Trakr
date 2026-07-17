import re

with open('src/features/budgets/BudgetManager.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'  const confirmDelete = async \(\) => \{.*?\} catch \(err: any\) \{.*?\}\n  \};', re.DOTALL)
replacement = """  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    try {
      showToast('Menghapus anggaran...', 'info');
      onDeleteBudget(budgetToDelete);
      showToast('Anggaran kategori berhasil dihapus', 'success');
      setBudgetToDelete(null);
    } catch (e) {
      showToast('Gagal menghapus anggaran', 'error');
    }
  };"""

content = re.sub(pattern, replacement, content)

with open('src/features/budgets/BudgetManager.tsx', 'w') as f:
    f.write(content)

print("Done")
