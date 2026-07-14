import fs from 'fs';
let code = fs.readFileSync('src/features/transactions/TransactionForm.tsx', 'utf8');

code = code.replace(/const \{ mutateAsync: createTransaction \} = useCreateTransaction\(\);\n/g, "");
code = code.replace(/const quickAddSub = \(\) => \{\n    if \(!newSubCatName\.trim\(\)\) return;\n    const existing = subCategoryOptions\.find\(s => s\.value\.toLowerCase\(\) === newSubCatName\.toLowerCase\(\)\);\n    if \(\!existing\) \{\n      setSubCategoryOptions\(\[...subCategoryOptions, \{ value: newSubCatName, label: newSubCatName \}\]\);\n    \}\n    setValue\('subcategory', newSubCatName\);\n    setNewSubCatName\(''\);\n  \};\n/g, "");

fs.writeFileSync('src/features/transactions/TransactionForm.tsx', code);
