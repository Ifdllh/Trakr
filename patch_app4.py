import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

target = re.compile(r"              <Dashboard \n                user=\{user\}\n                dbUser=\{dbUser\}\n                categories=\{mergedCategories\}\n                onOpenForm=\{openFormWithType\}\n                setActiveTab=\{setActiveTab\}\n                transactions=\{transactions\}\n                budgets=\{budgets\}\n                periods=\{periods\}\n                globalBudgets=\{globalBudgets\}\n                accounts=\{accounts\}\n              />")
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
                onSaveGlobalBudget={handleSaveGlobalBudget}
              />"""
app = re.sub(target, replace, app)

with open('src/App.tsx', 'w') as f:
    f.write(app)

print("Done")
