import re

with open('firestore.rules', 'r') as f:
    data = f.read()

# Fix isValidTransaction
data = data.replace(
    """    function isValidTransaction(data) {
      let hasRequiredKeys = data.keys().hasAll(['type', 'amount', 'category', 'accountId', 'date', 'createdAt']);
      
      let isValidBase = data.type is string && (data.type == 'pemasukan' || data.type == 'pengeluaran' || data.type == 'transfer') &&
                        data.amount is number &&
                        data.categoryId is string && data.categoryId.size() <= 128 &&""",
    """    function isValidTransaction(data) {
      let hasRequiredKeys = data.keys().hasAll(['type', 'amount', 'category', 'accountId', 'date', 'createdAt']);
      
      let isValidBase = data.type is string && (data.type == 'pemasukan' || data.type == 'pengeluaran' || data.type == 'transfer') &&
                        data.amount is number &&
                        data.category is string && data.category.size() <= 128 &&"""
)

with open('firestore.rules', 'w') as f:
    f.write(data)

print("Done")
