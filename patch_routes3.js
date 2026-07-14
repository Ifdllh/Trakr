import fs from 'fs';

let routes = fs.readFileSync('routes.ts', 'utf8');

// fix POST transactions
routes = routes.replace(
  /const payload = \{ \.\.\.item, userId \};\n\s*delete payload\.id;\n\s*delete payload\.createdAt;\n\s*delete payload\.updatedAt;/g,
  "const payload = { ...cleanPayload(item), userId };"
);

routes = routes.replace(
  /const payload = \{ \.\.\.req\.body, userId \};\n\s*delete payload\.id;\n\s*delete payload\.createdAt;\n\s*delete payload\.updatedAt;/g,
  "const payload = { ...cleanPayload(req.body), userId };"
);

fs.writeFileSync('routes.ts', routes);
