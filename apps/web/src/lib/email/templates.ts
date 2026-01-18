/**
 * Email templates for Block Club notifications.
 * Uses inline HTML/CSS for email client compatibility.
 */

import { getAppUrl } from "./service";
import type { LoanNotificationData } from "./types";

/**
 * Base HTML template with Block Club styling.
 */
function baseTemplate({
  preheader,
  title,
  body,
  ctaText,
  ctaUrl,
}: {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const appUrl = getAppUrl();
  const settingsUrl = `${appUrl}/settings/notifications`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9; color: #18181b; line-height: 1.6;">
  <!-- Preheader text (hidden but shown in inbox preview) -->
  <span style="display: none; font-size: 0; line-height: 0; max-height: 0; opacity: 0; overflow: hidden;">
    ${preheader}
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Block Club</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${body}
              ${ctaText && ctaUrl ? `
                <p style="margin-top: 24px;">
                  <a href="${ctaUrl}" style="display: inline-block; padding: 14px 28px; background: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">${ctaText}</a>
                </p>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background: #f4f4f5; text-align: center; font-size: 13px; color: #a1a1aa;">
              <p style="margin: 0;">
                You received this because you're a member of a Block Club neighborhood.
                <br>
                <a href="${settingsUrl}" style="color: #8b5cf6; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Loan requested notification - sent to item owner
 */
export function loanRequestedTemplate(data: LoanNotificationData): {
  subject: string;
  html: string;
} {
  const appUrl = getAppUrl();
  const itemUrl = `${appUrl}/neighborhoods/${data.neighborhoodSlug}/library/${data.itemId}`;

  const body = `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px; font-weight: 600;">New Borrow Request</h2>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">Hi ${data.ownerName},</p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      <strong style="color: #18181b;">${data.borrowerName}</strong> would like to borrow your
      <strong style="color: #18181b;">${data.itemName}</strong>.
    </p>
    ${data.notes ? `
      <p style="padding: 16px; background: #f4f4f5; border-radius: 8px; margin: 16px 0; color: #52525b; font-size: 14px; font-style: italic;">
        "${data.notes}"
      </p>
    ` : ""}
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Review the request and approve or decline it from your item page.
    </p>
  `;

  return {
    subject: `${data.borrowerName} wants to borrow your ${data.itemName}`,
    html: baseTemplate({
      preheader: `${data.borrowerName} requested to borrow ${data.itemName}`,
      title: "New Borrow Request",
      body,
      ctaText: "Review Request",
      ctaUrl: itemUrl,
    }),
  };
}

/**
 * Loan approved notification - sent to borrower
 */
export function loanApprovedTemplate(data: LoanNotificationData): {
  subject: string;
  html: string;
} {
  const appUrl = getAppUrl();
  const itemUrl = `${appUrl}/neighborhoods/${data.neighborhoodSlug}/library/${data.itemId}`;

  const dueDateText = data.dueDate
    ? `Please return it by <strong style="color: #18181b;">${data.dueDate}</strong>.`
    : "There's no set due date - just return it when you're done.";

  const body = `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px; font-weight: 600;">Request Approved!</h2>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">Hi ${data.borrowerName},</p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Great news! <strong style="color: #18181b;">${data.ownerName}</strong> has approved your request
      to borrow <strong style="color: #18181b;">${data.itemName}</strong>.
    </p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      ${dueDateText}
    </p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Contact ${data.ownerName} to arrange pickup.
    </p>
  `;

  return {
    subject: `Your request for ${data.itemName} was approved!`,
    html: baseTemplate({
      preheader: `${data.ownerName} approved your request to borrow ${data.itemName}`,
      title: "Request Approved",
      body,
      ctaText: "View Item",
      ctaUrl: itemUrl,
    }),
  };
}

/**
 * Loan declined notification - sent to borrower
 */
export function loanDeclinedTemplate(data: LoanNotificationData): {
  subject: string;
  html: string;
} {
  const appUrl = getAppUrl();
  const libraryUrl = `${appUrl}/neighborhoods/${data.neighborhoodSlug}/library`;

  const body = `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px; font-weight: 600;">Request Declined</h2>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">Hi ${data.borrowerName},</p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Unfortunately, <strong style="color: #18181b;">${data.ownerName}</strong> is unable to lend
      <strong style="color: #18181b;">${data.itemName}</strong> at this time.
    </p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Check out other items in the lending library - there might be something else that works for you!
    </p>
  `;

  return {
    subject: `Update on your request for ${data.itemName}`,
    html: baseTemplate({
      preheader: `Your request to borrow ${data.itemName} was declined`,
      title: "Request Update",
      body,
      ctaText: "Browse Library",
      ctaUrl: libraryUrl,
    }),
  };
}

/**
 * Loan returned notification - sent to owner
 */
export function loanReturnedTemplate(data: LoanNotificationData): {
  subject: string;
  html: string;
} {
  const appUrl = getAppUrl();
  const itemUrl = `${appUrl}/neighborhoods/${data.neighborhoodSlug}/library/${data.itemId}`;

  const body = `
    <h2 style="margin-top: 0; color: #18181b; font-size: 20px; font-weight: 600;">Item Returned</h2>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">Hi ${data.ownerName},</p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      <strong style="color: #18181b;">${data.itemName}</strong> has been marked as returned.
      It was borrowed by <strong style="color: #18181b;">${data.borrowerName}</strong>.
    </p>
    <p style="margin: 16px 0; color: #52525b; font-size: 15px;">
      Your item is now available for other neighbors to borrow.
    </p>
  `;

  return {
    subject: `${data.itemName} has been returned`,
    html: baseTemplate({
      preheader: `${data.borrowerName} returned ${data.itemName}`,
      title: "Item Returned",
      body,
      ctaText: "View Item",
      ctaUrl: itemUrl,
    }),
  };
}
