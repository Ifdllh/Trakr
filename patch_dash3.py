import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    db = f.read()

# Add onSaveGlobalBudget to DashboardProps
props_target = re.compile(r"  accounts\?: any\[\];\n\}")
props_replace = """  accounts?: any[];
  onSaveGlobalBudget?: (globalBudget: any, id?: string) => Promise<void>;
}"""
db = re.sub(props_target, props_replace, db)

# Add onSaveGlobalBudget to signature
sig_target = re.compile(r"  accounts = \[\]\n\}: DashboardProps\) \{")
sig_replace = """  accounts = [],
  onSaveGlobalBudget
}: DashboardProps) {"""
db = re.sub(sig_target, sig_replace, db)

# Remove the broken mutation line
db = re.sub(r'  const \{ mutate: saveMasterData \} = \(\);\n', '', db)

# Rewrite handleSaveBudget
handle_target = re.compile(r"  const handleSaveBudget = async \(\) => \{\n.*?saveMasterData\(\{[\s\S]*?\}\);\n.*?setIsEditingBudget\(false\);\n    \}\n  \};", re.DOTALL)
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
