/**
 * Email service abstraction layer.
 * Provides Resend integration with console fallback for development.
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";
import type { EmailPayload, EmailResult } from "./types";

/**
 * Get the base URL for the app.
 * Uses VERCEL_URL in production, localhost in development.
 */
export function getAppUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Email service interface
 */
interface EmailService {
  sendEmail(payload: EmailPayload): Promise<EmailResult>;
}

/**
 * Resend email service implementation
 */
class ResendEmailService implements EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: "Block Club <notifications@lakewoodblock.club>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      if (error) {
        logger.error("Resend API error", error, { to: payload.to });
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      logger.error("Failed to send email via Resend", error, { to: payload.to });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Console email service for development/testing.
 * Logs email details instead of sending.
 */
class ConsoleEmailService implements EmailService {
  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    console.log("\n📧 EMAIL (Console Mode - RESEND_API_KEY not configured)");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log("───────────────────────────────────────────────────────");
    // Log a truncated version of HTML for readability
    const truncatedHtml = payload.html.length > 500
      ? payload.html.substring(0, 500) + "...[truncated]"
      : payload.html;
    console.log(truncatedHtml);
    console.log("═══════════════════════════════════════════════════════\n");

    return { success: true, messageId: "console-mode" };
  }
}

/**
 * Get the configured email service.
 * Returns Resend service if RESEND_API_KEY is configured, otherwise console fallback.
 * Creates a new instance each call to support serverless environments.
 */
export function getEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return new ConsoleEmailService();
  }

  return new ResendEmailService(apiKey);
}

/**
 * Send an email using the configured service.
 * Convenience wrapper around getEmailService().sendEmail().
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const service = getEmailService();
  return service.sendEmail(payload);
}
