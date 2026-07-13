import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function rewrite() {
  const code = fs.readFileSync("server.ts", "utf8");
  const prompt = `You are an expert TypeScript developer.
Rewrite the provided Express server file to use Firebase Firestore (firebase-admin/firestore) instead of PostgreSQL (drizzle-orm).
- 'req.dbUserId' is gone. Use 'req.user.uid' (string).
- 'req.db' is the initialized Firestore instance (from firebase-admin).
- Replace all Drizzle ORM operations (db.select().from(table), db.insert, db.update, db.delete) with Firestore equivalents (req.db.collection('table_name').where('userId', '==', req.user.uid).get(), add(), doc().update(), etc.).
- Convert ID logic from auto-increment integers to Firestore auto-generated document IDs (strings).
- IMPORTANT: When returning Firestore documents, map them: \`{ id: doc.id, ...doc.data() }\`.
- Keep ALL existing routes (budgets, reports, ai chat, transactions).
- For AI chat: you still need to query categories, periods, budgets from firestore.
- REMOVE imports for drizzle-orm and drizzle schema. Remove any imports from "./src/db/schema" or "./src/db/index".
- Remove the "db" import. We will rely on "req.db" from middleware.
- For Multer / Cloudinary upload, keep it untouched.
- Ensure the output is valid TypeScript code. Do not wrap in markdown if possible.

Code to rewrite:
${code}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt
    });
    
    let text = response.text;
    if (text.startsWith("\`\`\`typescript")) {
      text = text.replace(/^\`\`\`typescript/, "").replace(/\`\`\`$/, "");
    } else if (text.startsWith("\`\`\`")) {
      text = text.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "");
    }
    
    fs.writeFileSync("server_new.ts", text.trim());
    console.log("Rewrote server.ts successfully");
  } catch(e) {
    console.error("Error:", e);
  }
}
rewrite();
