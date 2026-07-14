import fs from 'fs';

let routes = fs.readFileSync('routes.ts', 'utf8');

const parseId = `
const parseInteger = (val: any) => {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  // Cast foreign keys to integer if they exist
  const intFields = ['periodId', 'accountId', 'destinationAccountId', 'assetId', 'tagId', 'contactId', 'globalBudgetId'];
  for (const field of intFields) {
    if (result[field] !== undefined) {
      result[field] = parseInteger(result[field]);
    }
  }
  
  // Cast amounts to numbers
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }
  
  return result;
};
`;

routes = routes.replace(/const getTable = /g, parseId + '\nconst getTable = ');

// POST masterdata
routes = routes.replace(
  /const payload = \{ \.\.\.req\.body, userId \};\s*\/\/[^\n]*\n\s*delete payload\.id;\n\s*delete payload\.createdAt;\n\s*delete payload\.updatedAt;/g,
  "const payload = { ...cleanPayload(req.body), userId };"
);

// PUT masterdata
routes = routes.replace(
  /const payload = \{ \.\.\.req\.body \};\n\s*delete payload\.id;\n\s*delete payload\.userId;\n\s*delete payload\.createdAt;\n\s*delete payload\.updatedAt;/g,
  "const payload = cleanPayload(req.body);\n      delete payload.userId;"
);

fs.writeFileSync('routes.ts', routes);
