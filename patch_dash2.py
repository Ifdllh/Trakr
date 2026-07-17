import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

target = re.compile(r"          <BudgetMonitor \n            globalDashboardDate=\{dashboardDate\}\n            categories=\{categories\}\n            setActiveTab=\{setActiveTab\}\n          />")
replace = """          <BudgetMonitor 
            globalDashboardDate={dashboardDate}
            categories={categories}
            setActiveTab={setActiveTab}
            periods={periods}
            budgets={budgets}
            transactions={transactions}
          />"""
content = re.sub(target, replace, content)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)

print("Done")
