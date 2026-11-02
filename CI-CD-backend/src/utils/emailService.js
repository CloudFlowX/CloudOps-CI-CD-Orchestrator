import nodemailer from "nodemailer";
import { Resend } from "resend";
import logger from "../config/logger.js";

/**
 * Universal Email Delivery Service:
 * 1. Brevo HTTPS API (Port 443 - NEVER blocked by cloud hosts like Render)
 * 2. SMTP / Gmail with 4s timeout (Works on Localhost/VPS where ports 465/587 are open)
 * 3. Resend API (Port 443 HTTPS)
 * 
 * Returns { success, messageId, error, isSandboxRestriction, provider }
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const rawSmtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpUser = rawSmtpUser ? rawSmtpUser.trim() : null;
  const rawSmtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  const smtpPass = rawSmtpPass ? rawSmtpPass.replace(/\s+/g, "") : null;
  const smtpHost = process.env.SMTP_HOST || (smtpUser && smtpUser.includes("@gmail.com") ? "smtp.gmail.com" : null);

  const diagnostics = {
    hasSmtpUser: !!smtpUser,
    hasSmtpPass: !!smtpPass,
    hasBrevoKey: !!process.env.BREVO_API_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
    providerAttempted: null,
    smtpError: null,
  };

  // Strategy 1: Brevo HTTPS REST API (Port 443 - 100% allowed on Render free tier, sends to ANY recipient)
  if (process.env.BREVO_API_KEY) {
    diagnostics.providerAttempted = "brevo";
    try {
      const senderEmail = process.env.BREVO_SENDER || smtpUser || "royalkhurana1@gmail.com";
      const senderName = process.env.BREVO_SENDER_NAME || "CloudOps Orchestrator";

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      const brevoData = await brevoRes.json();

      if (!brevoRes.ok) {
        logger.error(`Brevo delivery failed for ${to}:`, brevoData);
        return {
          success: false,
          error: brevoData.message || "Brevo delivery failed",
          provider: "brevo",
          diagnostics,
        };
      }

      logger.info(`Email sent via Brevo HTTPS API to ${to} (MessageId: ${brevoData.messageId})`);
      return { success: true, messageId: brevoData.messageId, provider: "brevo", diagnostics };
    } catch (brevoErr) {
      logger.error(`Brevo HTTPS exception for ${to}:`, brevoErr);
    }
  }

  // Strategy 2: SMTP / Gmail (Quick 4s attempt, works on localhost/VPS where SMTP ports are not blocked)
  if (smtpHost && smtpUser && smtpPass) {
    diagnostics.providerAttempted = "smtp";
    try {
      const isGmail = smtpUser.includes("@gmail.com") || smtpHost === "smtp.gmail.com";
      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: "gmail",
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 4000,
              greetingTimeout: 4000,
              socketTimeout: 5000,
            }
          : {
              host: smtpHost,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: Number(process.env.SMTP_PORT) === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 4000,
              greetingTimeout: 4000,
              socketTimeout: 5000,
            }
      );

      const fromAddress = process.env.EMAIL_FROM || `CloudOps <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
      });

      logger.info(`Email sent via SMTP to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: "smtp", diagnostics };
    } catch (smtpErr) {
      logger.warn(`SMTP delivery failed for ${to} (often blocked by cloud hosts like Render):`, smtpErr.message);
      diagnostics.smtpError = smtpErr.message;
    }
  }

  // Strategy 3: Resend API (Port 443 HTTPS)
  diagnostics.providerAttempted = "resend";
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
          diagnostics,
        };
      }

      logger.info(`Email dispatched via Resend to ${to} (Id: ${sendResult.data?.id})`);
      return { success: true, messageId: sendResult.data?.id, provider: "resend", diagnostics };
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
        diagnostics,
      };
    }
  }

  const errorReason = diagnostics.smtpError
    ? `Render blocked outbound SMTP port (${diagnostics.smtpError})`
    : "No email service configured on the server";

  logger.warn(errorReason);
  return {
    success: false,
    error: errorReason,
    provider: "none",
    diagnostics,
  };
};

export default { sendEmail };
