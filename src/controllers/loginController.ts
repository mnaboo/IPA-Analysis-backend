// src/controllers/loginController.ts
import { Request, Response } from "express";
import userModel from "../models/user";
import { authentication, random } from "../models/helpers";
import { COOKIE_NAME, HEADER_NAME } from "../middleware/auth";

/** GET /api/v1/users — bez dotykania `authentication` */
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await userModel.find(
      {},
      { _id: 1, index: 1, mail: 1, role: 1, createdAt: 1, updatedAt: 1 }
    ).lean();
    return res.status(200).json({ status: "success", data: { users } });
  } catch (err) {
    console.error("Error💥 getAllUsers:", err);
    return res.status(500).json({ status: "failed", message: "getAllUsers error" });
  }
};

/** POST /api/v1/login */
export const login = async (req: Request, res: Response) => {
  try {
    const { mail, password } = req.body as { mail?: string; password?: string };
    if (typeof mail !== "string" || typeof password !== "string") {
      return res.status(400).json({ status: "failed", message: "Email and password are required." });
    }

    // pobierz tylko to, co potrzebne do weryfikacji
    const rawUser = await userModel.collection.findOne(
      { mail },
      {
        projection: {
          _id: 1,
          index: 1,
          mail: 1,
          role: 1,
          "authentication.password": 1,
          "authentication.salt": 1,
        },
      }
    );

    if (!rawUser?.authentication?.salt || !rawUser.authentication?.password) {
      return res.status(400).json({
        status: "failed",
        message: "Check your email address and password or create an account.",
      });
    }

    const expected = authentication(rawUser.authentication.salt as string, password);
    if (expected !== (rawUser.authentication.password as string)) {
      return res.status(403).json({
        status: "failed",
        message: "Check your email address and password or create an account.",
      });
    }

    // wygeneruj i zapisz sessionToken
    const sessionToken = authentication(random(), String(rawUser._id));
    await userModel.updateOne(
      { _id: rawUser._id },
      { $set: { "authentication.sessionToken": sessionToken } }
    );

    // ustaw cookie
    res.cookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000, // 8 godzin w milisekundach
    });

    const safeUser = {
      _id: rawUser._id,
      index: rawUser.index,
      mail: rawUser.mail,
      role: rawUser.role,
    };

    return res.status(200).json({ status: "success", data: { user: safeUser } });
  } catch (error) {
    console.error("Error💥 login:", error);
    return res.status(400).json({ status: "failed", message: "Login failed" });
  }
};

/** POST /api/v1/login/getUser */
export const getUser = async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.[COOKIE_NAME] as string | undefined;
  const headerToken = req.get(HEADER_NAME) ?? undefined;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : undefined;
  const sessionToken: string | undefined = cookieToken ?? (headerToken as string | undefined) ?? bodyToken;

  if (!sessionToken) {
    return res.status(401).json({ status: "failed", message: "No session token" });
  }

  try {
    const user = await userModel.findOne(
      { "authentication.sessionToken": sessionToken },
      { _id: 1, index: 1, mail: 1, role: 1 }
    ).lean();

    if (!user) return res.status(404).json({ status: "failed", message: "User not found" });
    return res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    console.error("Error💥 getUser:", error);
    return res.sendStatus(500);
  }
};
