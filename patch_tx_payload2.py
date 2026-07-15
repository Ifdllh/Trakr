import re

with open('src/features/transactions/TransactionForm.tsx', 'r') as f:
    content = f.read()

split_payload_regex = r"const payloads = validRows\.map\(row => \(\{.*?recurringConfig\s*\}\)\);"

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

with open('src/features/transactions/TransactionForm.tsx', 'w') as f:
    f.write(content)

