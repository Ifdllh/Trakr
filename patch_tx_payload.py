import re

with open('src/features/transactions/TransactionForm.tsx', 'r') as f:
    content = f.read()

split_payload_regex = r"const payloads = validRows\.map\(row => \(\{[^}]+\}\)\);"

split_payload_replacement = """const payloads = validRows.map(row => {
        const p: any = {
          type,
          amount: parseFloat(row.amount) || 0,
          category: row.category,
          subcategory: row.subcategory || 'Lainnya',
          date,
          accountId: String(accountId),
          splitGroupId: splitGroupId,
        };

        const rowDesc = row.description || description || `Bagi Transaksi - ${row.category}`;
        if (rowDesc) p.description = rowDesc;
        if (assetId) p.assetId = String(assetId);
        if (tagId) p.tagId = String(tagId);
        if (contactId) p.contactId = String(contactId);
        if (matchedPeriod) p.periodId = String(matchedPeriod.id);
        if (attachmentUrl) p.attachmentUrl = attachmentUrl;
        if (recurringConfig) p.recurringConfig = recurringConfig;
        
        return p;
      });"""

content = re.sub(split_payload_regex, split_payload_replacement, content, flags=re.MULTILINE | re.DOTALL)


single_payload_regex = r"const payload = \{\s*type,\s*amount: parsedAmount,\s*category:[^\n]+,\s*subcategory:[^\n]+,\s*date,\s*description,\s*accountId:[^\n]+,\s*destinationAccountId:[^\n]+,\s*assetId:[^\n]+,\s*tagId:[^\n]+,\s*contactId:[^\n]+,\s*periodId:[^\n]+,\s*attachmentUrl:[^\n]+,\s*recurringConfig\s*\};"

single_payload_replacement = """const payload: any = {
        type,
        amount: parsedAmount,
        category: type === 'transfer' ? 'Transfer' : category,
        subcategory: type === 'transfer' ? 'Transfer' : (subcategory || 'Lainnya'),
        date,
        accountId: String(accountId),
      };

      if (description) payload.description = description;
      if (destinationAccountId) payload.destinationAccountId = String(destinationAccountId);
      if (assetId) payload.assetId = String(assetId);
      if (tagId) payload.tagId = String(tagId);
      if (contactId) payload.contactId = String(contactId);
      if (matchedPeriod) payload.periodId = String(matchedPeriod.id);
      if (attachmentUrl) payload.attachmentUrl = attachmentUrl;
      if (recurringConfig) payload.recurringConfig = recurringConfig;"""

content = re.sub(single_payload_regex, single_payload_replacement, content, flags=re.MULTILINE | re.DOTALL)

with open('src/features/transactions/TransactionForm.tsx', 'w') as f:
    f.write(content)

