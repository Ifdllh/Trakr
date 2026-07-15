import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# Relax isValidTransaction
content = re.sub(
    r"function isValidTransaction\(data\)\s*\{[^}]*\}",
    """function isValidTransaction(data) {
      return data.keys().hasAll(['type', 'amount', 'category', 'subcategory', 'date', 'createdAt']) &&
             data.type is string &&
             data.amount is number &&
             data.category is string &&
             data.subcategory is string &&
             data.date is string &&
             data.createdAt is string;
    }""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Relax isValidBudget
content = re.sub(
    r"function isValidBudget\(data\)\s*\{[^}]*\}",
    """function isValidBudget(data) {
      return data.keys().hasAll(['periodId', 'categoryId', 'type', 'value', 'createdAt']) &&
             data.periodId is string &&
             data.categoryId is string &&
             data.type is string &&
             data.value is number &&
             data.createdAt is string;
    }""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Relax isValidPeriod
content = re.sub(
    r"function isValidPeriod\(data\)\s*\{[^}]*\}",
    """function isValidPeriod(data) {
      return data.keys().hasAll(['name', 'startDate', 'endDate', 'createdAt']) &&
             data.name is string &&
             data.startDate is string &&
             data.endDate is string &&
             data.createdAt is string;
    }""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Relax update rules for transactions
content = re.sub(
    r"allow update:\s+if\s+isAuthenticated\(\)\s+&&\s+isOwner\(userId\)\s+&&\s+isValidId\(transactionId\)\s+&&\s+isValidTransaction\(incoming\(\)\)\s+&&\s+incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt\s+&&\s+incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\([^)]+\);",
    """allow update: if isAuthenticated() && isOwner(userId) && isValidId(transactionId) && isValidTransaction(incoming()) &&
                      incoming().createdAt == existing().createdAt;""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Relax update rules for budgets
content = re.sub(
    r"allow update:\s+if\s+isAuthenticated\(\)\s+&&\s+isOwner\(userId\)\s+&&\s+isValidId\(budgetId\)\s+&&\s+isValidBudget\(incoming\(\)\)\s+&&\s+incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt\s+&&\s+incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\([^)]+\);",
    """allow update: if isAuthenticated() && isOwner(userId) && isValidId(budgetId) && isValidBudget(incoming()) &&
                      incoming().createdAt == existing().createdAt;""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Relax update rules for periods
content = re.sub(
    r"allow update:\s+if\s+isAuthenticated\(\)\s+&&\s+isOwner\(userId\)\s+&&\s+isValidId\(periodId\)\s+&&\s+isValidPeriod\(incoming\(\)\)\s+&&\s+incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt\s+&&\s+incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\([^)]+\);",
    """allow update: if isAuthenticated() && isOwner(userId) && isValidId(periodId) && isValidPeriod(incoming()) &&
                      incoming().createdAt == existing().createdAt;""",
    content,
    flags=re.MULTILINE | re.DOTALL
)

with open('firestore.rules', 'w') as f:
    f.write(content)
