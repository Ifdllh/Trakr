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
  app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const db = getFirestoreDb(req.authEnv!);
      const userDocRef = db.collection('users').doc(req.userId!);
      const docSnap = await userDocRef.get();
      const firestoreData = docSnap.exists ? docSnap.data() : {};
      res.json({
        displayName: firestoreData?.displayName || '',
        phoneNumber: firestoreData?.phoneNumber || '',
        monthlyBudget: parseFloat(firestoreData?.monthlyBudget) || 0,
        currency: firestoreData?.currency || 'IDR - Rupiah',
        financialStartDay: parseInt(firestoreData?.financialStartDay) || 1,
        photoURL: firestoreData?.photoURL || ''
      });
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/user/profile", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const db = getFirestoreDb(req.authEnv!);
      const userDocRef = db.collection('users').doc(req.userId!);
      const docSnap = await userDocRef.get();
      const exists = docSnap.exists;
      const firestoreData = exists ? (typeof docSnap.data === 'function' ? docSnap.data() : docSnap) : {};

      const { displayName, phoneNumber, monthlyBudget, photoURL } = req.body;
      const updateData: any = {};
      
      updateData.uid = firestoreData.uid || req.userId!;
      updateData.email = firestoreData.email || req.user?.email || 'guest@example.com';
      updateData.createdAt = firestoreData.createdAt || new Date().toISOString();

      if (displayName !== undefined) updateData.displayName = displayName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (monthlyBudget !== undefined) updateData.monthlyBudget = parseFloat(monthlyBudget) || 0;
      if (photoURL !== undefined) updateData.photoURL = photoURL;
      
      await userDocRef.set(updateData, { merge: true });
      res.json({ success: true, ...updateData });
    } catch (e) {
      next(e);
    }
  });

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
      if (existingDoc && existingDoc.createdAt) {
        payload.createdAt = existingDoc.createdAt;
      }

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
      if (existingDoc && existingDoc.createdAt) {
        payload.createdAt = existingDoc.createdAt;
      }
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
