import nodemailer from "nodemailer";
import { Resend } from "resend";
import logger from "../config/logger.js";

/**
 * Universal Email Delivery Service:
 * 1. Uses SMTP/Gmail if SMTP_USER or GMAIL_USER is configured in .env (Sends to ANY email, no domain required).
 * 2. Uses Resend API if RESEND_API_KEY is configured in .env.
 * 
 * Returns { success, messageId, error, isSandboxRestriction, provider }
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (smtpUser && smtpUser.includes("@gmail.com") ? "smtp.gmail.com" : null);

  // Strategy 1: SMTP / Gmail (Can send to ANY email address in the world)
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT) || 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromAddress = process.env.EMAIL_FROM || `CloudOps <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
      });

      logger.info(`Email sent via SMTP to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: "smtp" };
    } catch (smtpErr) {
      logger.error(`SMTP delivery failed for ${to}:`, smtpErr);
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: smtpErr.message, provider: "smtp" };
      }
      logger.info("Attempting fallback to Resend...");
    }
  }

  // Strategy 2: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.EMAIL_FROM || "CloudOps <onboarding@resend.dev>";

      const sendResult = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });

      if (sendResult.error) {
        const errorMsg = sendResult.error.message || "Failed to send email via Resend";
        const isSandboxRestriction =
          sendResult.error.statusCode === 403 ||
          sendResult.error.statusCode === 422 ||
          errorMsg.toLowerCase().includes("testing email") ||
          errorMsg.toLowerCase().includes("own email address") ||
          errorMsg.toLowerCase().includes("verify a domain") ||
          errorMsg.toLowerCase().includes("testing email address");

        logger.error(`Resend email delivery error for ${to}:`, sendResult.error);

        return {
          success: false,
          error: errorMsg,
          isSandboxRestriction,
          provider: "resend",
        };
      }

      logger.info(`Email dispatched via Resend to ${to} (Id: ${sendResult.data?.id})`);
      return { success: true, messageId: sendResult.data?.id, provider: "resend" };
    } catch (resendErr) {
      const errorMsg = resendErr.message || "Resend connection error";
      const isSandboxRestriction =
        errorMsg.toLowerCase().includes("testing emails to your own email address") ||
        errorMsg.toLowerCase().includes("verify a domain");

      logger.error(`Resend exception for ${to}:`, resendErr);

      return {
        success: false,
        error: errorMsg,
        isSandboxRestriction,
        provider: "resend",
      };
    }
  }

  logger.warn("No email service configured (neither SMTP nor RESEND_API_KEY found).");
  return {
    success: false,
    error: "No email service configured on the server",
    provider: "none",
  };
};

export default { sendEmail };
