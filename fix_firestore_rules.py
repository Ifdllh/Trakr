import re

with open('firestore.rules', 'r') as f:
    data = f.read()

# Fix isValidTransaction
data = data.replace(
    "['type', 'amount', 'categoryId', 'accountId', 'date', 'createdAt']",
    "['type', 'amount', 'category', 'accountId', 'date', 'createdAt']"
)
data = data.replace(
    "data.categoryId is string && data.categoryId.size() <= 128",
    "data.category is string && data.category.size() <= 128"
)
data = data.replace(
    "!data.keys().hasAny(['subcategoryId']) || (data.subcategoryId is string && data.subcategoryId.size() <= 128)",
    "!data.keys().hasAny(['subcategory']) || (data.subcategory is string && data.subcategory.size() <= 128)"
)

# Update transaction's update rule
data = data.replace(
    "hasOnly(['type', 'amount', 'categoryId', 'accountId', 'date', 'description', 'subcategoryId', 'attachmentUrl', 'updatedAt', 'createdAt']);",
    "hasOnly(['type', 'amount', 'category', 'subcategory', 'accountId', 'destinationAccountId', 'assetId', 'tagId', 'contactId', 'periodId', 'splitGroupId', 'date', 'description', 'attachmentUrl', 'isRecurring', 'recurringFrequency', 'recurringEndDate', 'recurringConfig', 'updatedAt', 'createdAt']);"
)

with open('firestore.rules', 'w') as f:
    f.write(data)

print("Done")
