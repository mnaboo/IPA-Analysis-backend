import { Request, Response, NextFunction } from "express";
import { getUserBySessionToken, Role } from "../models/user";

export const COOKIE_NAME = "MACIEJ-AUTH";
export const HEADER_NAME = "x-session-token";

declare global {
  namespace Express {
    interface Request { currentUser?: any }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token =
    (req.cookies?.[COOKIE_NAME] as string | undefined) ||
    (req.get(HEADER_NAME) ?? undefined);

  if (!token) {
    return res.status(401).json({ status: "failed", message: "Not authenticated" });
  }

  const user = await getUserBySessionToken(token).select("_id mail role").lean();
  if (!user) {
    return res.status(401).json({ status: "failed", message: "Invalid session" });
  }

  req.currentUser = user;
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
