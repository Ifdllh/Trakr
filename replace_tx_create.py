import re

with open('src/hooks/useAppData.ts', 'r') as f:
    content = f.read()

pattern = re.compile(r"    \} else \{\n      // Create can be an array if bulk create.*?\n      try \{\n        const res = await transactionService\.save\(transactionData\);\n        refreshData\(\);\n        if \(Array\.isArray\(res\)\) \{\n          setTransactions\(prev => \[\.\.\.prev, \.\.\.res\]\);\n        \} else \{\n          setTransactions\(prev => \[\.\.\.prev, \{ \.\.\.transactionData, id: res\.id \} as any\]\);\n        \}\n        queryClient\.invalidateQueries\(\{ queryKey: \['transactions'\] \}\);\n      \} catch \(error: any\) \{\n        showToast\(error\.message \|\| 'Terjadi kesalahan', 'error'\);\n        throw error;\n      \}\n    \}", re.DOTALL)

replacement = """    } else {
      const isArray = Array.isArray(transactionData);
      const tempIds = isArray ? transactionData.map(() => Math.random().toString(36).substring(2, 15)) : [Math.random().toString(36).substring(2, 15)];
      
      const optimisticData = isArray 
        ? transactionData.map((t, i) => ({ ...t, id: tempIds[i] }))
        : [{ ...transactionData, id: tempIds[0] }];
        
      setTransactions(prev => [...prev, ...optimisticData]);

      (async () => {
        try {
          const res = await transactionService.save(transactionData);
          refreshData();
          
          // Replace temp IDs with real IDs if needed, though invalidateQueries handles full refresh
          setTransactions(prev => {
            let next = [...prev];
            if (Array.isArray(res)) {
               res.forEach((r, i) => {
                 const idx = next.findIndex(t => String(t.id) === tempIds[i]);
                 if (idx !== -1) next[idx] = { ...next[idx], ...r };
               });
            } else {
               const idx = next.findIndex(t => String(t.id) === tempIds[0]);
               if (idx !== -1) next[idx] = { ...next[idx], ...res };
            }
            return next;
          });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        } catch (error: any) {
          setTransactions(rollbackData);
          showToast(error.message || 'Terjadi kesalahan', 'error');
        }
      })();
    }"""

content = re.sub(pattern, replacement, content)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(content)

print("Done")
