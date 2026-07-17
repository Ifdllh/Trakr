import re

with open('routes.ts', 'r') as f:
    content = f.read()

# Replace POST transactions
post_target = re.compile(r'  app\.post\("/api/transactions", requireAuth, async \(req: AuthRequest, res: any, next: any\) => \{.*?\n  \}\);\n', re.DOTALL)
post_replace = """  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      
      if (Array.isArray(req.body)) {
        const results = [];
        for (const item of req.body) {
          const payload = cleanPayload(item);
          payload.createdAt = new Date().toISOString();
          payload.updatedAt = new Date().toISOString();
          const docId = Math.random().toString(36).substring(2, 15);
          const docRef = colRef.doc(docId);
          await docRef.set(payload);
          results.push({ id: docId, ...payload, _status: "async_processing_started" });
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        payload.createdAt = new Date().toISOString();
        payload.updatedAt = new Date().toISOString();
        const docId = Math.random().toString(36).substring(2, 15);
        const docRef = colRef.doc(docId);
        await docRef.set(payload);
        res.json({ id: docId, ...payload, _status: "async_processing_started" });
      }

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed CREATE for transactions`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });\n"""
content = re.sub(post_target, post_replace, content)


# Replace PUT transactions
put_target = re.compile(r'  app\.put\("/api/transactions/:id", requireAuth, async \(req: AuthRequest, res: any, next: any\) => \{.*?\n  \}\);\n', re.DOTALL)
put_replace = """  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      const existingDoc = await getDoc(docRef);
      if (!existingDoc) return res.status(404).json({ error: "Transaction not found" });

      const payload = cleanPayload(req.body);
      payload.updatedAt = new Date().toISOString();
      if (existingDoc && existingDoc.createdAt) {
        payload.createdAt = existingDoc.createdAt;
      }
      await docRef.set(payload, { merge: true });
      
      res.json({ id: docId, ...existingDoc, ...payload, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed UPDATE for transactions ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });\n"""
content = re.sub(put_target, put_replace, content)


# Replace DELETE transactions
del_target = re.compile(r'  app\.delete\("/api/transactions/:id", requireAuth, async \(req: AuthRequest, res: any, next: any\) => \{.*?\n  \}\);\n', re.DOTALL)
del_replace = """  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      await docRef.delete();
      
      res.json({ success: true, id: docId, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed DELETE for transactions ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });\n"""
content = re.sub(del_target, del_replace, content)


with open('routes.ts', 'w') as f:
    f.write(content)

print("Done")
