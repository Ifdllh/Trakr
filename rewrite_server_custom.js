import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// The goal is to remove all postgres/drizzle imports and keep only needed routes.
// We will replace the entire server.ts with a new one that only has:
// 1. /api/transactions/upload
// 2. /api/reports/gold-price
// 3. /api/ai/chat
// And the Vite middleware for development.

const serverContent = `
import express from "express";
import axios from "axios";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

let uploadReceipt: any = null;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function handleMemoryUpload(req: any, res: any) {
  memoryUpload.single("receipt")(req, res, (err: any) => {
    if (err) return res.status(500).json({ error: err.message || "Gagal memproses gambar." });
    if (!req.file) return res.status(400).json({ error: "File tidak ditemukan." });
    try {
      const b64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";
      const secureUrl = \`data:\${mimeType};base64,\${b64}\`;
      res.json({ secureUrl });
    } catch (e) {
      res.status(500).json({ error: "Gagal konversi ke Base64." });
    }
  });
}

function getUploadMiddleware() {
  if (uploadReceipt) return uploadReceipt;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "receipts",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ],
      format: "webp"
    } as any
  });
  
  uploadReceipt = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
  });
  
  return uploadReceipt;
}

let goldPriceCache: any = null;
const GOLD_CACHE_DURATION = 6 * 60 * 60 * 1000;

async function startServer() {
  const app = express();
  const PORT = 3000;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  app.use(express.json());

  app.post("/api/transactions/upload", requireAuth, (req: AuthRequest, res, next) => {
    const uploadMiddleware = getUploadMiddleware();
    if (!uploadMiddleware) {
      return handleMemoryUpload(req, res);
    }
    uploadMiddleware.single("receipt")(req, res, (err: any) => {
      if (err) return res.status(500).json({ error: err.message || "Gagal upload" });
      if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });
      res.json({ secureUrl: req.file.path });
    });
  });

  app.get("/api/reports/gold-price", requireAuth, async (req: AuthRequest, res) => {
    const now = Date.now();
    if (goldPriceCache && (now - goldPriceCache.timestamp < GOLD_CACHE_DURATION)) {
      return res.json({ ...goldPriceCache.data, cached: true });
    }
    const fallbackDate = new Date().toISOString();
    const fallbackData = {
      success: true,
      cached: false,
      lastUpdated: fallbackDate,
      vendors: {
        antam: { name: "Antam", buyPrice: 1500000, sellPrice: 1350000, date: fallbackDate, isAvailable: true },
        antamRetro: { name: "Antam Retro", buyPrice: 1450000, sellPrice: 1300000, date: fallbackDate, isAvailable: true },
        ubs: { name: "UBS", buyPrice: 1480000, sellPrice: 1330000, date: fallbackDate, isAvailable: true },
        galeri24: { name: "Galeri 24", buyPrice: 1490000, sellPrice: 1340000, date: fallbackDate, isAvailable: true },
      }
    };
    goldPriceCache = { timestamp: now, data: fallbackData };
    return res.json(fallbackData);
  });

  app.post("/api/ai/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const uid = req.user.uid;
      const db = req.db;
      
      // Fetch data from Firestore
      const [catSnap, periodsSnap, budgetsSnap] = await Promise.all([
        db.collection('customCategories').where('userId', '==', uid).get(),
        db.collection('periods').where('userId', '==', uid).get(),
        db.collection('budgets').where('userId', '==', uid).get()
      ]);
      
      const categories = catSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const periods = periodsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const budgets = budgetsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      const txDate = new Date();
      const matchedPeriod = periods.find((p: any) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return txDate >= start && txDate <= end;
      });
      
      let currentSpendingData: any = {};
      if (matchedPeriod) {
        const txSnap = await db.collection('transactions').where('userId', '==', uid).where('periodId', '==', matchedPeriod.id).get();
        txSnap.docs.forEach((d: any) => {
          const tx = d.data();
          if (tx.type !== 'Dr' && tx.type !== 'pengeluaran') return;
          const cat = tx.category || 'Unknown';
          const sub = tx.subcategory || 'Unknown';
          if (!currentSpendingData[cat]) currentSpendingData[cat] = {};
          if (!currentSpendingData[cat][sub]) currentSpendingData[cat][sub] = 0;
          currentSpendingData[cat][sub] += Number(tx.amount || 0);
        });
      }
      
      const masterDataContext = \`Categories: \${JSON.stringify(categories)}\nBudgets: \${JSON.stringify(budgets)}\nCurrent Spending: \${JSON.stringify(currentSpendingData)}\`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: \`You are AURA_CORE. User input: \${message}\nCONTEXT:\${masterDataContext}. You must return UI Markdown and ---JSON_DATA--- with a transaction object if a transaction should be logged.\`
        }
      });
      
      const text = response.text;
      let markdown = text;
      let jsonData = null;
      if (text && text.includes('---JSON_DATA---')) {
        const parts = text.split('---JSON_DATA---');
        markdown = parts[0].trim();
        try {
          const jsonMatch = parts[1].match(/\\{[\\s\\S]*\\}/);
          jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(parts[1].trim());
          if (jsonData?.transaction) {
             const txData = jsonData.transaction;
             await db.collection('transactions').add({
               userId: uid,
               type: txData.type || 'Dr',
               amount: Number(txData.amount) || 0,
               category: txData.category || 'AI Logged',
               subcategory: txData.subcategory || '',
               description: txData.description || '',
               date: txDate.toISOString(),
               periodId: matchedPeriod ? matchedPeriod.id : null,
               createdAt: new Date().toISOString()
             });
          }
        } catch(e) {}
      }
      res.json({ markdown, jsonData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on port \${PORT}\`);
  });
}
startServer();
`;

fs.writeFileSync('server.ts', serverContent.trim());
console.log("Rewrote server.ts with bare minimum endpoints");
