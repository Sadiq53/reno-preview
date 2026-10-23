/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * High-performance, zero-dependency integration via Brevo REST API v3
 * Tailored for Crewvia Vanguard - Agency Visual Annotator & Zero-Trust Access Broker
 * 
 * Design Theme: Light Mode, Production-Grade, Executive & Human Copywriting,
 * featuring official Crewvia Vanguard branding and logo.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: EmailRecipient;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends a transactional email using Brevo API v3.
 * Automatically falls back to simulated development mode if BREVO_API_KEY is not configured.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || "notifications@crewvia.com";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Crewvia Vanguard";

  // Graceful simulation mode for development/testing if no API key is set
  if (!apiKey || apiKey === "your-brevo-api-key" || apiKey.length < 10) {
    console.log("--------------------------------------------------");
    console.log("[BREVO EMAIL SERVICE] SIMULATION MODE (No valid BREVO_API_KEY found)");
    console.log(`To: ${options.to.map((r) => `${r.name ? `${r.name} <${r.email}>` : r.email}`).join(", ")}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Sender: ${senderName} <${senderEmail}>`);
    console.log("--------------------------------------------------");
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: options.to.map((recipient) => ({
        email: recipient.email.trim().toLowerCase(),
        ...(recipient.name ? { name: recipient.name.trim() } : {}),
      })),
      subject: options.subject,
      htmlContent: options.htmlContent,
      ...(options.textContent ? { textContent: options.textContent } : {}),
      ...(options.replyTo
        ? {
            replyTo: {
              email: options.replyTo.email.trim(),
              ...(options.replyTo.name ? { name: options.replyTo.name.trim() } : {}),
            },
          }
        : {}),
    };

    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.message || data?.error || `Brevo API returned status ${res.status}`;
      console.error("[BREVO EMAIL ERROR]", { status: res.status, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error("[BREVO DISPATCH EXCEPTION]", err);
    return {
      success: false,
      error: err.message || "Network error while connecting to Brevo",
    };
  }
}

// -------------------------------------------------------------
// Light-Theme, Highly Personalized, Production-Grade Email Templates
// -------------------------------------------------------------

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vanguard.crewvia.in")
  );
}

/**
 * 1. Client & Reviewer Preview Invitation Email
 * Light theme, warm and personalized, featuring the official Crewvia Vanguard logo.
 */
export async function sendPreviewShareEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  projectName: string;
  shareUrl: string;
  accessLevel: "VIEWER" | "COMMENTER";
  senderName?: string;
  customNote?: string;
}): Promise<SendEmailResult> {
  const isCommenter = params.accessLevel === "COMMENTER";
  const roleTitle = isCommenter ? "Commenter (Interactive Pinpoint Feedback)" : "Viewer (Read-Only Review)";
  const inviter = params.senderName || "Your Agency Team";
  const greetingName = params.recipientName || "there";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.projectName} - Interactive Preview Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Top Header with Vanguard Logo & Badge -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <!-- Logo Image with Fallback Monogram -->
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #2563eb;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.02em;">
                            Client Website Preview
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #15803d; letter-spacing: 0.02em;">
                      ${isCommenter ? "Comment Access" : "View Only"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 36px 20px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Hi ${greetingName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                <strong>${inviter}</strong> has prepared an interactive website preview for <strong>${params.projectName}</strong> and would love your review and feedback.
              </p>

              ${
                params.customNote
                  ? `
              <!-- Personal Message Box -->
              <div style="background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">Note from ${inviter}:</div>
                <div style="font-size: 13px; color: #1e293b; font-style: italic; line-height: 1.5;">&ldquo;${params.customNote}&rdquo;</div>
              </div>`
                  : ""
              }

              <!-- Workspace Scope Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; font-weight: 600;">Project:</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 700; color: #0f172a;">${params.projectName}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; font-weight: 600;">Permission:</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 600; color: ${isCommenter ? "#15803d" : "#2563eb"};">${roleTitle}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">What you can do:</td>
                        <td align="right" style="font-size: 12px; color: #475569; max-width: 260px;">
                          ${
                            isCommenter
                              ? "Inspect responsive viewports (Desktop, Tablet, Mobile) and click anywhere on the page to drop pinpoint feedback notes."
                              : "Inspect responsive viewports and test interactive navigation in a secure, sandboxed preview."
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.shareUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
                      Open Interactive Preview &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                No password or account creation required. Your unique token is embedded in the link.
              </p>

              <!-- Direct Link Fallback -->
              <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #64748b; word-break: break-all;">
                <span style="font-weight: 600; color: #475569;">Direct Link:</span> <a href="${params.shareUrl}" style="color: #2563eb; text-decoration: underline;">${params.shareUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                Crewvia Vanguard &bull; Visual Quality Assurance & Client Review
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Sent on behalf of ${inviter}. If you have any questions, reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: params.recipientEmail, name: params.recipientName }],
    subject: `Review Invitation: ${params.projectName} - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${greetingName},\n${inviter} has invited you to review ${params.projectName}.\nAccess Scope: ${roleTitle}\n\nOpen interactive preview: ${params.shareUrl}\n\nNo password or login needed.`,
  });
}

/**
 * 2. Developer Project Assignment Trigger Email
 * Light theme, warm and personalized, explicit project parameters and zero-trust guidelines.
 */
export async function sendDeveloperAssignmentEmail(params: {
  developerEmail?: string;
  recipientEmail?: string;
  developerName?: string;
  recipientName?: string;
  projectName: string;
  wpRoleTemplate?: string;
  accessLevel?: string;
  expiresAt: Date | string;
  portalUrl?: string;
  workspaceUrl?: string;
  assignedBy?: string;
}): Promise<SendEmailResult> {
  const devEmail = params.developerEmail || params.recipientEmail || "";
  const devName = params.developerName || params.recipientName || "Developer";
  const roleName = params.wpRoleTemplate || params.accessLevel || "RESTRICTED_ADMIN";
  const portalUrl = params.portalUrl || params.workspaceUrl || `${getAppBaseUrl()}/developer`;

  const expiryDate = new Date(params.expiresAt);
  const expiryStr = isNaN(expiryDate.getTime())
    ? "Active Project Window"
    : expiryDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Assignment: ${params.projectName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #2563eb;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                            Developer Access Portal
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #1d4ed8; letter-spacing: 0.02em;">
                      New Assignment
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Hi ${devName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                You have been assigned to <strong>${params.projectName}</strong>. Your workspace and task board are now unlocked.
              </p>

              <!-- Assignment Info Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; font-weight: 600;">Project:</td>
                        <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 700; color: #0f172a;">${params.projectName}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; font-weight: 600;">Assigned Role:</td>
                        <td align="right" style="padding-bottom: 10px;">
                          <span style="display: inline-block; padding: 3px 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px; font-weight: 700; color: #15803d;">
                            ${roleName.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Access Period:</td>
                        <td align="right" style="font-size: 12px; font-weight: 700; color: #d97706; font-family: monospace;">
                          Until ${expiryStr}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #1e40af; line-height: 1.5;">
                <strong>Zero-Trust Access:</strong> You can launch single-click WordPress sessions directly from your dashboard using the Crewvia Vanguard Companion extension without requiring client master passwords.
              </div>

              <!-- Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
                      Open Developer Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust WordPress Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: devEmail, name: devName }],
    subject: `Access Granted: Assigned to ${params.projectName} - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${devName},\nYou have been assigned to ${params.projectName}.\nRole: ${roleName}\nValid until: ${expiryStr}\n\nOpen workspace: ${portalUrl}`,
  });
}

/**
 * 3. Developer Account Creation / Credentials Dispatch Email
 * Light theme, personalized welcoming tone, secure credentials card, and first-time guidance.
 */
export async function sendDeveloperCredentialsEmail(params: {
  developerEmail?: string;
  recipientEmail?: string;
  developerName?: string;
  recipientName?: string;
  tempPassword?: string;
  temporaryPassword?: string;
  loginUrl?: string;
}): Promise<SendEmailResult> {
  const devEmail = params.developerEmail || params.recipientEmail || "";
  const devName = params.developerName || params.recipientName || "Developer";
  const tempPass = params.temporaryPassword || params.tempPassword || "TempPassword123!";
  const loginUrl = params.loginUrl || `${getAppBaseUrl()}/login`;
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Crewvia Vanguard Developer Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #2563eb;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                            Contractor Onboarding
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #15803d; letter-spacing: 0.02em;">
                      Account Provisioned
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Welcome to the team, ${devName}!
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                An agency administrator has provisioned your developer account on Crewvia Vanguard. You can sign in below to access your assigned client workspaces and task board.
              </p>

              <!-- Credentials Card -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Login URL:</td>
                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #2563eb; font-family: monospace;">
                      <a href="${loginUrl}" style="color: #2563eb; text-decoration: none;">${loginUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Username / Email:</td>
                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; font-family: monospace;">
                      ${devEmail}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Temporary Password:</td>
                    <td align="right" style="padding: 8px 0;">
                      <span style="display: inline-block; background: #ffffff; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: 0.04em;">
                        ${tempPass}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Recommendation -->
              <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #b45309; line-height: 1.5;">
                <strong>Security Reminder:</strong> Please sign in and update your temporary password in your profile settings upon your first login.
              </div>

              <!-- CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
                      Sign In to Developer Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust Agency Workspace & Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: devEmail, name: devName }],
    subject: `Your Account Credentials - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${devName},\nWelcome to Crewvia Vanguard! Your developer account has been created.\nLogin URL: ${loginUrl}\nEmail: ${devEmail}\nTemporary Password: ${tempPass}\n\nPlease update your password after your first login.`,
  });
}

/**
 * 4. Official Account Suspension Notice Email
 * Dispatched to a developer when an agency administrator places their account on suspension.
 */
export async function sendAccountSuspensionEmail(params: {
  developerEmail: string;
  developerName: string;
  durationText?: string;
  reason?: string;
  suspendedUntil?: Date | null;
}): Promise<SendEmailResult> {
  const devEmail = params.developerEmail.trim();
  const devName = params.developerName.trim() || "Developer";
  const duration = params.durationText || (params.suspendedUntil ? `Until ${params.suspendedUntil.toLocaleDateString()}` : "Indefinite / Permanent");
  const reasonText = params.reason?.trim() || "Administrative security review & access restriction";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Status Notice - Crewvia Vanguard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #fef2f2; background: #fff5f5;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #fecaca;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #dc2626;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #991b1b;">
                            Security & Access Notice
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #dc2626; letter-spacing: 0.02em;">
                      Account Suspended
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Notice for ${devName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                This official notice informs you that your developer account and all associated WordPress zero-trust sandbox privileges on <strong>Crewvia Vanguard</strong> have been placed on suspension by the agency administrator.
              </p>

              <!-- Suspension Details Card -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Suspension Duration:</td>
                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #b91c1c;">
                      ${duration}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Reason / Note:</td>
                    <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;">
                      ${reasonText}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Active Sessions:</td>
                    <td align="right" style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #dc2626;">
                      Immediately Revoked & Logged Out
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Information Alert -->
              <div style="background: #fff1f2; border-left: 3px solid #e11d48; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #9f1239; line-height: 1.5;">
                <strong>What this means:</strong> You will be unable to log in to the portal or launch WordPress sessions for any assigned projects while this suspension remains active. If this suspension is temporary, access will be restored automatically upon expiration or upon administrative review.
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                If you have questions regarding this action or believe this is an error, please contact your agency administrator or project lead directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust Agency Workspace & Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: devEmail, name: devName }],
    subject: `Important Notice: Your Account Has Been Suspended - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${devName},\n\nYour developer account on Crewvia Vanguard has been placed on suspension by the administrator.\nDuration: ${duration}\nReason: ${reasonText}\n\nAll active sessions and project accesses have been revoked. If you believe this is in error, please contact your agency administrator.`,
  });
}

/**
 * 5. Official Account Reactivation Notice Email
 * Dispatched to a developer when an agency administrator reactivates their suspended account.
 */
export async function sendAccountReactivationEmail(params: {
  developerEmail: string;
  developerName: string;
  loginUrl?: string;
}): Promise<SendEmailResult> {
  const devEmail = params.developerEmail.trim();
  const devName = params.developerName.trim() || "Developer";
  const loginUrl = params.loginUrl || `${getAppBaseUrl()}/login`;
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Restored - Crewvia Vanguard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #bbf7d0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f0fdf4; background: #f0fdf4;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #bbf7d0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #16a34a;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #15803d;">
                            Account Restored
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #dcfce7; border: 1px solid #86efac; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #16a34a; letter-spacing: 0.02em;">
                      Active & Verified
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Welcome back, ${devName}!
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Your developer account on <strong>Crewvia Vanguard</strong> has been successfully reactivated by the agency administrator. Your sign-in access is now fully restored.
              </p>

              <!-- Positive Alert -->
              <div style="background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #166534; line-height: 1.5;">
                <strong>All systems ready:</strong> You can now sign in to your workspace dashboard, review your active projects, and receive new task assignments.
              </div>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.25);">
                      Sign In to Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust Agency Workspace & Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: devEmail, name: devName }],
    subject: `Account Reactivated - Welcome Back to Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${devName},\n\nGreat news! Your developer account on Crewvia Vanguard has been reactivated.\nYou can now sign in to access your projects and task board.\nLogin URL: ${loginUrl}\n\nWelcome back!`,
  });
}

/**
 * 6. Email Change OTP Verification Notice
 * Dispatched when an administrator changes their primary account email.
 */
export async function sendEmailChangeOtpEmail(params: {
  toEmail: string;
  userName?: string;
  otpCode: string;
}): Promise<SendEmailResult> {
  const targetEmail = params.toEmail.trim();
  const userName = params.userName || "Administrator";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your New Email - Crewvia Vanguard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #2563eb;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                            Security & Account Center
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #1d4ed8;">
                      OTP Verification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                We received a request to update the primary administrative email address for your <strong>Crewvia Vanguard</strong> account to this email address. Please use the verification code below to confirm this change:
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 20px;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
                      Your 6-Digit Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #2563eb;">
                      ${params.otpCode}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                      Expires in 10 minutes &bull; Single-use only
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; line-height: 1.5;">
                <strong>Security Notice:</strong> If you did not initiate this email update request in your account settings, please ignore this email. Your current account details will remain unchanged.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust Agency Workspace & Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: targetEmail, name: userName }],
    subject: `Verify Your New Email Address (Code: ${params.otpCode}) - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hi ${userName},\n\nYour 6-digit verification code to update your email is: ${params.otpCode}\n\nThis code expires in 10 minutes. If you did not request this, please disregard this email.`,
  });
}

/**
 * 7. 2FA Password Recovery Email Notice
 * Dispatched when an administrator or developer requests account password recovery.
 */
export async function sendPasswordRecoveryOtpEmail(params: {
  toEmail: string;
  userName?: string;
  otpCode: string;
}): Promise<SendEmailResult> {
  const targetEmail = params.toEmail.trim();
  const userName = params.userName || "User";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2FA Password Recovery - Crewvia Vanguard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${baseUrl}/logo/vanguard-icon.png" alt="Crewvia Vanguard" width="36" height="36" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            Crewvia <span style="color: #2563eb;">Vanguard</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                            2FA Security & Recovery
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #dc2626;">
                      Password 2FA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                Hello ${userName},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                A password reset request was initiated for your <strong>Crewvia Vanguard</strong> account. Enter the 6-digit two-factor verification code below to authorize your password reset:
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 20px;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
                      Your 2FA Recovery Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #dc2626;">
                      ${params.otpCode}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                      Valid for 10 minutes &bull; Single-use authorization
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #991b1b; line-height: 1.5;">
                <strong>Never share this code:</strong> Crewvia Vanguard support representatives will never ask you for your 2FA code. If you did not request this reset, your account password remains safe, but we recommend signing in to check active sessions.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
              Crewvia Vanguard &bull; Zero-Trust Agency Workspace & Access Broker
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail({
    to: [{ email: targetEmail, name: userName }],
    subject: `Your 2FA Password Recovery Code (${params.otpCode}) - Crewvia Vanguard`,
    htmlContent,
    textContent: `Hello ${userName},\n\nYour 2FA password recovery code for Crewvia Vanguard is: ${params.otpCode}\n\nThis code expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
  });
}


