// src/controllers/logoutController.ts
import { Request, Response } from "express";
import userModel from "../models/user";
import { COOKIE_NAME, HEADER_NAME } from "../middleware/auth";

/** POST /api/v1/logout */
export const logout = async (req: Request, res: Response) => {
  //Pobranie tokena tak samo jak w getUser (cookie -> header -> body)
  const cookieToken = req.cookies?.[COOKIE_NAME] as string | undefined;
  const headerToken = req.get(HEADER_NAME) ?? undefined;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : undefined;
  const sessionToken: string | undefined = cookieToken ?? (headerToken as string | undefined) ?? bodyToken;

  try {
    if (sessionToken) {
      // Unieważnia sesję w DB
      await userModel.updateOne(
        { "authentication.sessionToken": sessionToken },
        { $unset: { "authentication.sessionToken": "", "authentication.sessionExpiresAt": "" } }
      );
    }

    res.clearCookie(COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({ status: "success", message: "Logged out" });
  } catch (err) {
    console.error("Error💥 logout:", err);
    return res.status(500).json({ status: "failed", message: "Logout error" });
  }
};
