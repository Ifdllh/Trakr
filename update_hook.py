import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

# For Edit
edit_pattern = re.compile(r"(else if \(collectionName === 'contacts'\) \{ rollbackData = contacts; setFunc = setContacts; setContacts\(prev => prev\.map\(p => String\(p\.id\) === id \? \{ \.\.\.p, \.\.\.data \} : p\)\); \})")
edit_replacement = r"\1\n      else if (collectionName === 'periods') { rollbackData = periods; setFunc = setPeriods; setPeriods(prev => prev.map(p => String(p.id) === id ? { ...p, ...data } : p)); }"
content = re.sub(edit_pattern, edit_replacement, content)

# For Create
create_pattern = re.compile(r"(else if \(collectionName === 'contacts'\) setContacts\(prev => \[\.\.\.prev, newItem\]\);)")
create_replacement = r"\1\n        else if (collectionName === 'periods') setPeriods(prev => [...prev, newItem]);"
content = re.sub(create_pattern, create_replacement, content)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
