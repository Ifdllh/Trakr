import { Request, Response, NextFunction } from "express";
import { adminAuthDev, adminAuthPrd, authContext } from "../lib/firebase-admin.js";

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
  authEnv?: 'dev' | 'prd';
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const authEnv = req.headers['x-auth-env'] === 'prd' ? 'prd' : 'dev';
  req.authEnv = authEnv;

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
      uid: decodedToken.uid,
    };
    req.userId = decodedToken.uid;

    if (req.user.isGuest) {
      // Enforce guest read-only sandbox restrictions for write requests
      if (req.method !== "GET") {
        return res.status(403).json({ error: "Fitur ini dinonaktifkan untuk akun Tamu" });
      }
    }

    authContext.run({ token }, () => {
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: "Unauthorized: Invalid token" });
  }
};
