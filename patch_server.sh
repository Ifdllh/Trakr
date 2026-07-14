#!/bin/bash
awk '
/app\.use\(\(err: any, req: any, res: any, next: any\) => \{/ {
  print "import { setupApiRoutes } from \"./routes\";"
  print "setupApiRoutes(app);"
  print $0
  next
}
{ print $0 }
' server.ts > server.ts.tmp
mv server.ts.tmp server.ts
