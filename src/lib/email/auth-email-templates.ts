export type AuthEmailKind = "verification" | "password-reset";

export type AuthEmailTemplateInput = {
  actionUrl: string;
  recipientName?: string | null;
};

export type AuthEmailTemplate = {
  html: string;
  subject: string;
  text: string;
};

const brandName = "Kuraishi Autohandel";
const supportEmail = "office@kuraishi-autohandel.at";

const emailCopy = {
  verification: {
    actionLabel: "Verify email address",
    body: "Confirm your email address to finish creating your account and keep your Kuraishi profile secure.",
    fallback:
      "If you did not create a Kuraishi account, you can ignore this email.",
    subject: "Verify your Kuraishi account",
    title: "Verify your email address",
  },
  "password-reset": {
    actionLabel: "Reset password",
    body: "We received a request to reset the password for your Kuraishi account.",
    fallback:
      "If you did not request a password reset, you can ignore this email.",
    subject: "Reset your Kuraishi password",
    title: "Reset your password",
  },
} as const satisfies Record<
  AuthEmailKind,
  {
    actionLabel: string;
    body: string;
    fallback: string;
    subject: string;
    title: string;
  }
>;

export function renderVerificationEmail(
  input: AuthEmailTemplateInput,
): AuthEmailTemplate {
  return renderAuthEmail("verification", input);
}

export function renderPasswordResetEmail(
  input: AuthEmailTemplateInput,
): AuthEmailTemplate {
  return renderAuthEmail("password-reset", input);
}

export function renderAuthEmail(
  kind: AuthEmailKind,
  input: AuthEmailTemplateInput,
): AuthEmailTemplate {
  const copy = emailCopy[kind];
  const actionUrl = normalizeActionUrl(input.actionUrl);
  const recipientName = normalizeRecipientName(input.recipientName);
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  return {
    subject: copy.subject,
    text: [
      copy.title,
      "",
      greeting,
      "",
      copy.body,
      "",
      actionUrl,
      "",
      copy.fallback,
      "",
      `Questions? Contact ${supportEmail}.`,
      "",
      brandName,
    ].join("\n"),
    html: renderHtmlEmail({
      actionLabel: copy.actionLabel,
      actionUrl,
      body: copy.body,
      fallback: copy.fallback,
      greeting,
      title: copy.title,
    }),
  };
}

function renderHtmlEmail({
  actionLabel,
  actionUrl,
  body,
  fallback,
  greeting,
  title,
}: {
  actionLabel: string;
  actionUrl: string;
  body: string;
  fallback: string;
  greeting: string;
  title: string;
}) {
  const safeActionUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f5f2ec;color:#1d1a16;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(body)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f2ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf2;border:1px solid #e0d6c8;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 18px;border-bottom:1px solid #e0d6c8;">
                <div style="font-size:13px;letter-spacing:0;text-transform:uppercase;color:#8f3d2f;font-weight:700;">${escapeHtml(brandName)}</div>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#1d1a16;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#312a24;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#312a24;">${escapeHtml(body)}</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeActionUrl}" style="display:inline-block;border-radius:6px;background:#8f3d2f;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:14px 18px;">${escapeHtml(actionLabel)}</a>
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#5f554b;">${escapeHtml(fallback)}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6f655b;">If the button does not work, copy and paste this link into your browser:<br><a href="${safeActionUrl}" style="color:#8f3d2f;word-break:break-all;">${safeActionUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background:#1d1a16;color:#f5f2ec;font-size:13px;line-height:1.6;">
                ${escapeHtml(brandName)}<br>
                <a href="mailto:${escapeHtml(supportEmail)}" style="color:#f5f2ec;text-decoration:underline;">${escapeHtml(supportEmail)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function normalizeActionUrl(actionUrl: string) {
  const url = new URL(actionUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Auth email action URL must use http or https.");
  }

  return url.href;
}

function normalizeRecipientName(name: string | null | undefined) {
  const normalized = name?.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
