import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Match budgetAlerts
budget_alerts_pattern = r"  const budgetAlerts = useMemo\(\(\) => \{.*?\n  \}, \[activeBudgetAllocations, categories, monthlyTransactions\]\);\n"

match = re.search(budget_alerts_pattern, content, flags=re.DOTALL)
if match:
    budget_alerts_text = match.group(0)
    content = content[:match.start()] + content[match.end():]
    
    # insert it after monthlyTransactions
    insert_pattern = r"const monthlyTransactions = useMemo\(\(\) => \{.*?\n  \}, \[transactions, selectedMonth, selectedYear\]\);\n"
    insert_match = re.search(insert_pattern, content, flags=re.DOTALL)
    
    if insert_match:
        content = content[:insert_match.end()] + "\n" + budget_alerts_text + content[insert_match.end():]
        with open('src/features/reports/Dashboard.tsx', 'w') as f:
            f.write(content)
        print("Moved budgetAlerts successfully.")
    else:
        print("Could not find monthlyTransactions block.")
else:
    print("Could not find budgetAlerts block.")

