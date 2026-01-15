// src/config/mailer.ts
import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!cachedTransporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      throw new Error("SMTP_USER or SMTP_PASS is missing in environment variables");
    }

    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  return cachedTransporter;
}

/**
 * Wysyłka maila z kodem resetu hasła.
 */
export async function sendPasswordResetEmail(to: string, code: string) {
  console.log("DEBUG MAILER AUTH:", {
    user: process.env.SMTP_USER,
    passSet: !!process.env.SMTP_PASS,
  });

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "[mailer] Brak SMTP_USER lub SMTP_PASS – nie wysyłam maila. Kod resetu:",
      code
    );
    return;
  }

  const transporter = getTransporter();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const appName = process.env.APP_NAME || "IPA Analysis";
  const expiresMinutes = Number(process.env.RESET_CODE_EXPIRES_MINUTES) || 15;

  const text = `Twój kod do resetu hasła w ${appName} to: ${code}. Kod jest ważny przez ${expiresMinutes} minut.`;
  const html = `<p>Twój kod do resetu hasła w <b>${appName}</b> to: <b>${code}</b>.</p><p>Kod jest ważny przez ${expiresMinutes} minut.</p>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Reset hasła - kod weryfikacyjny",
    text,
    html,
  });
}

/**
 * Wysyłka maila z kodem rejestracyjnym.
 */
export async function sendRegistrationCodeEmail(to: string, code: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[mailer] Brak SMTP_USER lub SMTP_PASS – nie wysyłam maila rejestracyjnego:", code);
    return;
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const appName = process.env.APP_NAME || "IPA Analysis";
  const expiresMinutes = Number(process.env.REGISTRATION_CODE_EXPIRES_MINUTES) || 15;

  const text = `Twój kod aktywacyjny w ${appName} to: ${code}. Kod jest ważny przez ${expiresMinutes} minut.`;
  const html = `<p>Twój kod aktywacyjny w <b>${appName}</b> to: <b>${code}</b>.</p><p>Kod jest ważny przez ${expiresMinutes} minut.</p>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Aktywacja konta - kod weryfikacyjny",
    text,
    html,
  });
}

