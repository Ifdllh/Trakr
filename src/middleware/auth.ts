import { Request, Response, NextFunction } from "express";
import { adminAuthDev, adminAuthPrd, dbDev, dbPrd } from "../lib/firebase-admin";

export interface AuthRequest extends Request {
  user?: any;
  authEnv?: 'dev' | 'prd';
  db?: any; // firestore instance
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const authEnv = req.headers['x-auth-env'] === 'prd' ? 'prd' : 'dev';
  req.authEnv = authEnv;
  req.db = authEnv === 'prd' && dbPrd ? dbPrd : dbDev;
  
  try {
    let decodedToken;
    if (authEnv === 'prd' && adminAuthPrd) {
      decodedToken = await adminAuthPrd.verifyIdToken(token);
    } else {
      decodedToken = await adminAuthDev.verifyIdToken(token);
    }
    
    // Check if user is a guest (anonymous or has guest email)
    const isGuest = decodedToken.firebase?.sign_in_provider === 'anonymous' || decodedToken.email?.includes('guest');
    
    req.user = {
      ...decodedToken,
      isGuest,
      uid: decodedToken.uid
    };
    
    if (isGuest) {
      // Enforce guest read-only sandbox restrictions for write requests
      if (req.method !== "GET") {
        return res.status(403).json({ error: "Fitur ini dinonaktifkan untuk akun Tamu" });
      }
    }
    
    next();
  } catch (error) {
    console.error(`Error verifying Firebase ID token (${authEnv}):`, error);
    return res.status(403).json({ error: "Unauthorized: Invalid token" });
  }
};
