import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = re.compile(r"              <TransactionList periods=\{periods\} \n                categories=\{mergedCategories\}\n                accounts=\{accounts\}\n                onEdit=\{handleEditRequest\}\n                onDelete=\{handleDeleteTransaction\}\n              />")
replace = """              <TransactionList periods={periods} 
                categories={mergedCategories}
                accounts={accounts}
                onEdit={handleEditRequest}
                onDelete={handleDeleteTransaction}
                transactions={transactions}
              />"""
content = re.sub(target, replace, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Done")
