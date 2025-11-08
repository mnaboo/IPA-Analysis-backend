// src/controllers/loginController.ts
import { Request, Response } from "express";
import userModel from "../models/user";
import { authentication, random } from "../models/helpers";
import { COOKIE_NAME, HEADER_NAME } from "../middleware/auth";
import { sendPasswordResetEmail } from "../config/mailer";

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
  try {
    const token =
      (req.cookies?.[COOKIE_NAME] as string | undefined) ||
      (req.get(HEADER_NAME) ?? undefined);

    if (!token) {
      return res.status(401).json({ status: "failed", message: "No session token found" });
    }

    const user = await userModel.findOne(
      { "authentication.sessionToken": token },
      { _id: 1, mail: 1, role: 1 }
    ).lean();

    if (!user) {
      return res.status(404).json({ status: "failed", message: "User not found or session expired" });
    }

    return res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    console.error("Error💥 getUser:", error);
    return res.status(500).json({ status: "failed", message: "Server error while fetching user data" });
  }
};

/** POST /api/v1/login/password-reset/request */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { mail } = req.body as { mail?: string };

    if (typeof mail !== "string") {
      return res
        .status(400)
        .json({ status: "failed", message: "Email is required." });
    }

    // Generujemy 6-cyfrowy kod
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt =
      Number(process.env.RESET_CODE_EXPIRES_MINUTES) || 15;
    const expiryDate = new Date(Date.now() + expiresAt * 60 * 1000);

    const user = await userModel.findOne(
      { mail },
      { _id: 1, mail: 1 }
    ).lean();

    if (user) {
      // Zapisz kod i datę ważności
      await userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            "authentication.resetCode": code,
            "authentication.resetCodeExpiresAt": expiryDate,
          },
        }
      );

      // Wyślij maila
      await sendPasswordResetEmail(user.mail, code);
    }

    // Zawsze zwracamy 200 – nie ujawniamy czy mail istnieje
    return res.status(200).json({
      status: "success",
      message:
        "If an account with this email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Error💥 requestPasswordReset:", error);
    return res
      .status(500)
      .json({ status: "failed", message: "Password reset request failed." });
  }
};

/** POST /api/v1/login/password-reset/confirm */
export const confirmPasswordReset = async (req: Request, res: Response) => {
  try {
    const { mail, code, newPassword } = req.body as {
      mail?: string;
      code?: string;
      newPassword?: string;
    };

    if (
      typeof mail !== "string" ||
      typeof code !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        status: "failed",
        message: "Email, code and newPassword are required.",
      });
    }

    const now = new Date();

    const user = await userModel.findOne(
      {
        mail,
        "authentication.resetCode": code,
        "authentication.resetCodeExpiresAt": { $gt: now },
      },
      { _id: 1 }
    );

    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or expired reset code.",
      });
    }

    // Hash nowego hasła (tak samo jak przy signup)
    const salt = random();
    const hashedPassword = authentication(salt, newPassword);

    await userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          "authentication.password": hashedPassword,
          "authentication.repeatPassword": hashedPassword,
          "authentication.salt": salt,
        },
        $unset: {
          "authentication.resetCode": "",
          "authentication.resetCodeExpiresAt": "",
          "authentication.sessionToken": "", // 🔐 wyloguj wszystkie sesje
        },
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error💥 confirmPasswordReset:", error);
    return res
      .status(500)
      .json({ status: "failed", message: "Password reset failed." });
  }
};

