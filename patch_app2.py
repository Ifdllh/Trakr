import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = re.compile(r"          <TransactionForm \n            categories=\{mergedCategories\}\n            onSave=\{handleSaveTransaction\}\n            onClose=\{\(\) => \{\n              setIsFormOpen\(false\);\n              setEditingTransaction\(null\);\n            \}\}\n            transactionToEdit=\{editingTransaction\}\n            initialType=\{initialFormType\}\n            accounts=\{accounts\}\n            assets=\{assets\}\n            tags=\{tags\}\n            contacts=\{contacts\}\n            onSaveMasterData=\{handleSaveMasterData\}\n          />")
replace = """          <TransactionForm 
            categories={mergedCategories}
            onSave={handleSaveTransaction}
            onClose={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
            transactionToEdit={editingTransaction}
            initialType={initialFormType}
            accounts={accounts}
            assets={assets}
            tags={tags}
            contacts={contacts}
            onSaveMasterData={handleSaveMasterData}
            periods={periods}
          />"""
content = re.sub(target, replace, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Done")
