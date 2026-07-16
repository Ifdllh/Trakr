import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { getFirestoreDb } from "./src/lib/firebase-admin.js";

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }
  
  return result;
};

const getFirestoreCollectionName = (collectionName: string): string => {
  const map: Record<string, string> = {
    'customCategories': 'customCategories',
    'categories': 'customCategories',
    'customAccounts': 'accounts',
    'accounts': 'accounts',
    'customContacts': 'contacts',
    'contacts': 'contacts',
    'customTags': 'tags',
    'tags': 'tags',
    'customPeriods': 'periods',
    'periods': 'periods',
    'customAssets': 'assets',
    'assets': 'assets',
    'budgetAllocations': 'budgets',
    'budgets': 'budgets',
    'transactions': 'transactions',
    'globalBudgets': 'globalBudgets'
  };
  return map[collectionName] || collectionName;
};

const getCollectionRef = (authEnv: 'dev' | 'prd', userId: string, collectionName: string) => {
  const db = getFirestoreDb(authEnv);
  const firestoreCollection = getFirestoreCollectionName(collectionName);
  return db.collection('users').doc(userId).collection(firestoreCollection);
};

const getDocs = async (colRef: any) => {
  const snapshot = await colRef.get();
  const docs = snapshot.docs || [];
  return docs.map((doc: any) => {
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    return {
      id: doc.id,
      ...data
    };
  });
};

const getDoc = async (docRef: any) => {
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = typeof snap.data === 'function' ? snap.data() : snap;
  return {
    id: snap.id,
    ...data
  };
};

export function setupApiRoutes(app: any) {
  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
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
      res.json({ id: docId, ...payload });
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

      await docRef.set(payload, { merge: true });
      res.json({ id: docId, ...existingDoc, ...payload });
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
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docs = await getDocs(colRef);
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
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
          results.push({ id: docId, ...payload });
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        payload.createdAt = new Date().toISOString();
        payload.updatedAt = new Date().toISOString();
        const docId = Math.random().toString(36).substring(2, 15);
        const docRef = colRef.doc(docId);
        await docRef.set(payload);
        res.json({ id: docId, ...payload });
      }
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      const existingDoc = await getDoc(docRef);
      if (!existingDoc) return res.status(404).json({ error: "Transaction not found" });

      const payload = cleanPayload(req.body);
      payload.updatedAt = new Date().toISOString();
      await docRef.set(payload, { merge: true });
      res.json({ id: docId, ...existingDoc, ...payload });
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      await docRef.delete();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
}
