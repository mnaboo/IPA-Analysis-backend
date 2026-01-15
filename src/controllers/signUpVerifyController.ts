// src/controllers/signUpVerifyController.ts
import { Request, Response } from "express";
import { random, authentication } from "../models/helpers";
import userModel, { getUserByEmail } from "../models/user";
import { userVerificationModel, getVerificationByMail, deleteVerificationByMail } from "../models/userVerification";
import { sendRegistrationCodeEmail } from "../config/mailer";

/** POST /api/v1/signup/request */
export const requestRegistration = async (req: Request, res: Response) => {
  try {
    const { mail, password, repeatPassword } = req.body;

    if (!mail || !password || !repeatPassword)
      return res.status(400).json({ status: "failed", message: "Email and both passwords are required" });

    if (password !== repeatPassword)
      return res.status(403).json({ status: "failed", message: "Passwords do not match" });

    // 6 cyfr przed @ i domena stud.prz.edu.pl
    const match = mail.match(/^(\d{6})@stud\.prz\.edu\.pl$/);
    if (!match)
      return res.status(400).json({ status: "failed", message: "Email must be in format 123456@stud.prz.edu.pl" });

    if (await getUserByEmail(mail))
      return res.status(400).json({ status: "failed", message: "User with this email already exists" });

    const salt = random();
    const hashedPassword = authentication(salt, password);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + (Number(process.env.REGISTRATION_CODE_EXPIRES_MINUTES) || 15) * 60000);

    // Nadpisz poprzednie (jeśli istnieje)
    await userVerificationModel.findOneAndUpdate(
      { mail },
      { code, password: hashedPassword, repeatPassword: hashedPassword, salt, expiresAt },
      { upsert: true }
    );

    await sendRegistrationCodeEmail(mail, code);

    return res.status(200).json({
      status: "success",
      message: "Verification code sent to your email.",
    });
  } catch (err) {
    console.error("Error💥 requestRegistration:", err);
    res.status(500).json({ status: "failed", message: "Registration request failed" });
  }
};

/** POST /api/v1/signup/confirm */
export const confirmRegistration = async (req: Request, res: Response) => {
  try {
    const { mail, code } = req.body;

    if (!mail || !code)
      return res.status(400).json({ status: "failed", message: "Email and code are required" });

    const record = await getVerificationByMail(mail);
    if (!record)
      return res.status(404).json({ status: "failed", message: "No pending registration found for this email" });

    if (record.code !== code)
      return res.status(400).json({ status: "failed", message: "Invalid verification code" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ status: "failed", message: "Verification code has expired" });

    const indexMatch = mail.match(/^(\d{6})@stud\.prz\.edu\.pl$/);
    const index = indexMatch ? indexMatch[1] : "000000";

    const userDoc = await userModel.create({
      index,
      mail,
      role: "user",
      authentication: {
        salt: record.salt,
        password: record.password,
        repeatPassword: record.repeatPassword,
      },
    });

    await deleteVerificationByMail(mail);

    const { authentication: _auth, ...safe } = userDoc.toObject();
    res.status(201).json({ status: "success", message: "Account created successfully", data: { user: safe } });
  } catch (err) {
    console.error("Error💥 confirmRegistration:", err);
    res.status(500).json({ status: "failed", message: "Account confirmation failed" });
  }
};
