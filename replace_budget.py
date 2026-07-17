import re

with open('src/features/budgets/BudgetManager.tsx', 'r') as f:
    content = f.read()

# Replace mutation usage with prop usage
content = content.replace("const deleteMutation = useDeleteCategoryBudget(selectedPeriod);", "")

pattern = re.compile(r'  const confirmDelete = async \(\) => \{.*?setBudgetToDelete\(null\);\n    \} catch \(e\) \{.*?\}\n  \};', re.DOTALL)
replacement = """  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    try {
      showToast('Menghapus anggaran...', 'info');
      onDeleteBudget(budgetToDelete);
      showToast('Anggaran berhasil dihapus', 'success');
      setBudgetToDelete(null);
    } catch (e) {
      showToast('Gagal menghapus anggaran', 'error');
    }
  };"""

content = re.sub(pattern, replacement, content)

content = content.replace("disabled={deleteMutation.isPending}", "disabled={false}")
content = content.replace("{deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}", "'Hapus'")

with open('src/features/budgets/BudgetManager.tsx', 'w') as f:
    f.write(content)

print("Done")
