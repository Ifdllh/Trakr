import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import "../lib/firebase-admin";

export interface AuthRequest extends Request {
  user?: any;
  dbUserId?: number; // from your users table if you need it
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Check if user is a guest (anonymous or has guest email)
    const isGuest = decodedToken.firebase?.sign_in_provider === 'anonymous' || decodedToken.email?.includes('guest');
    
    req.user = {
      ...decodedToken,
      isGuest
    };
    
    if (isGuest) {
      req.dbUserId = 999999; // Set standard dummy ID for guest session
      
      // Enforce guest read-only sandbox restrictions for write requests
      if (req.method !== "GET") {
        return res.status(403).json({ error: "Fitur ini dinonaktifkan untuk akun Tamu" });
      }
      
      return next();
    }
    
    // For non-guest users, proceed with database lookup
    import('../db/index').then(({ db }) => {
      import('../db/schema').then(({ users }) => {
        import('drizzle-orm').then(({ eq }) => {
          db.select().from(users).where(eq(users.uid, decodedToken.uid)).then(results => {
            if (results.length > 0) {
              req.dbUserId = results[0].id;
              next();
            } else {
              // Auto-register non-guest authenticated users (like Google/email signups) in the users table
              const userEmail = decodedToken.email || `user-${decodedToken.uid.substring(0, 8)}@sakupintar.com`;
              db.insert(users).values({
                uid: decodedToken.uid,
                email: userEmail
              }).returning().then(inserted => {
                if (inserted.length > 0) {
                  req.dbUserId = inserted[0].id;
                }
                next();
              }).catch(insertErr => {
                console.error("DB auto-registration error:", insertErr);
                next();
              });
            }
          }).catch(err => {
             console.error("DB lookup error", err);
             next();
          });
        });
      });
    });

  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(403).json({ error: "Unauthorized: Invalid token" });
  }
};
