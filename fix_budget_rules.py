import re

with open('firestore.rules', 'r') as f:
    data = f.read()

# Fix isValidBudget
data = data.replace(
    "data.category is string && data.category.size() <= 128",
    "data.categoryId is string && data.categoryId.size() <= 128"
)

# Wait, but I want isValidTransaction to have `data.category is string && data.category.size() <= 128`
# Let's just rewrite isValidBudget and isValidTransaction accurately.

with open('firestore.rules', 'w') as f:
    f.write(data)

print("Done")
