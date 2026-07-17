import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = re.compile(r"              <Dashboard \n                user=\{user\}\n                dbUser=\{dbUser\}\n                categories=\{mergedCategories\}\n                onOpenForm=\{openFormWithType\}\n                setActiveTab=\{setActiveTab\}\n              />")
replace = """              <Dashboard 
                user={user}
                dbUser={dbUser}
                categories={mergedCategories}
                onOpenForm={openFormWithType}
                setActiveTab={setActiveTab}
                transactions={transactions}
                budgets={budgets}
                periods={periods}
                globalBudgets={globalBudgets}
                accounts={accounts}
              />"""
content = re.sub(target, replace, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Done")
