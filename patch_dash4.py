import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    db = f.read()

handle_target = re.compile(r"  const handleSaveBudget = async \(\) => \{[\s\S]*?setIsEditingBudget\(false\);\n    \}\n  \};", re.DOTALL)
handle_replace = """  const handleSaveBudget = async () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val >= 0) {
      if (activeGlobalBudget && onSaveGlobalBudget) {
        await onSaveGlobalBudget({ ...activeGlobalBudget, totalTargetAmount: val }, activeGlobalBudget.id);
      } else if (onSaveGlobalBudget) {
        await onSaveGlobalBudget({ periodId: activePeriodId, totalTargetAmount: val, createdAt: new Date().toISOString() });
      }
      setIsEditingBudget(false);
    }
  };"""
db = re.sub(handle_target, handle_replace, db)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(db)

print("Done")
