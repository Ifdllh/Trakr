#!/bin/bash
awk '
/app.post\("\/api\/transactions", requireAuth, async \(req: AuthRequest, res: any, next: any\) => \{/ {
  print $0
  print "    try {"
  print "      const uid = req.user.uid;"
  print "      const db = req.db;"
  print "      if (Array.isArray(req.body)) {"
  print "        const batch = db.batch();"
  print "        const results: any[] = [];"
  print "        req.body.forEach((item: any) => {"
  print "          const payload = { ...item, userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };"
  print "          const docRef = db.collection(\"transactions\").doc();"
  print "          batch.set(docRef, payload);"
  print "          results.push({ id: docRef.id, ...payload });"
  print "        });"
  print "        await batch.commit();"
  print "        res.json(results);"
  print "      } else {"
  print "        const payload = { ...req.body, userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };"
  print "        const docRef = await db.collection(\"transactions\").add(payload);"
  print "        res.json({ id: docRef.id, ...payload });"
  print "      }"
  print "    } catch (e) {"
  print "      next(e);"
  print "    }"
  print "  });"
  
  # Skip the original body of app.post
  in_post = 1
  next
}
in_post {
  if (/^  \}\);$/) {
    in_post = 0
  }
  next
}
{ print $0 }
' routes.ts > routes.ts.tmp
mv routes.ts.tmp routes.ts
