import re

with open('routes.ts', 'r') as f:
    content = f.read()

# Using regex to replace the entire masterdata block
pattern = re.compile(r'app\.get\("/api/masterdata/:collection".*?app\.get\("/api/transactions"', re.DOTALL)

replacement = """app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docs = await getDocs(colRef);
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const payload = cleanPayload(req.body);
      payload.createdAt = new Date().toISOString();
      payload.updatedAt = new Date().toISOString();
      const docId = Math.random().toString(36).substring(2, 15);
      const docRef = colRef.doc(docId);
      await docRef.set(payload);
      
      res.json({ id: docId, ...payload, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed CREATE for ${req.params.collection} ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      const existingDoc = await getDoc(docRef);
      if (!existingDoc) return res.status(404).json({ error: "Document not found" });

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
           console.log(`[Background Job] Processed UPDATE for ${req.params.collection} ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      await docRef.delete();
      
      res.json({ success: true, id: docId, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed DELETE for ${req.params.collection} ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/transactions\""""

content = re.sub(pattern, replacement, content)

with open('routes.ts', 'w') as f:
    f.write(content)

print("Done")
