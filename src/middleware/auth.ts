import { Request, Response, NextFunction } from "express";
import { getUserBySessionToken, Role } from "../models/user";

export const COOKIE_NAME = "MACIEJ-AUTH";
export const HEADER_NAME = "x-session-token";

declare global {
  namespace Express {
    interface Request { currentUser?: any }
  }
}

// pomocniczo: wyciągnij usera z tokenu (cookie/header)
async function resolveUserFromRequest(req: Request) {
  const token =
    (req.cookies?.[COOKIE_NAME] as string | undefined) ||
    (req.get(HEADER_NAME) ?? undefined);

  if (!token) return null;

  const user = await getUserBySessionToken(token)
    .select("_id mail role")
    .lean();

  return user ?? null;
}

/** Wymaga zalogowania */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ status: "failed", message: "Not authenticated" });
  }
  req.currentUser = user;
  next();
};

/** Wymaga, aby użytkownik był NIEzalogowany (gość) */
export const requireGuest = async (req: Request, res: Response, next: NextFunction) => {
  const user = await resolveUserFromRequest(req);
  if (user) {
    // już zalogowany – nie powinien korzystać z tego endpointu
    return res.status(409).json({ status: "failed", message: "Already authenticated" });
  }
  next();
};

export const requireRole = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ status: "failed", message: "Not authenticated" });
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({ status: "failed", message: "Forbidden" });
    }
    next();
  };
