import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./db";

// SMTP 設定があれば送信、無ければ MailLog に記録のみ (開発用)
export async function sendMail(to: string, subject: string, body: string) {
  if (!to) return;
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info(`[mail:log] to=${to} subject=${subject}`);
    await prisma.mailLog.create({ data: { to, subject, body, status: "LOGGED" } });
    return;
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text: body });
    await prisma.mailLog.create({ data: { to, subject, body, status: "SENT" } });
  } catch (e) {
    console.error("mail send failed", e);
    await prisma.mailLog.create({ data: { to, subject, body, status: "FAILED", error: String(e).slice(0, 500) } });
  }
}
