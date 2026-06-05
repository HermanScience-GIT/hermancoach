const resendApiKey = process.env.RESEND_API_KEY || "";
const resendApiBaseUrl = (process.env.RESEND_API_BASE_URL || "https://api.resend.com").replace(/\/$/, "");
const fromName = process.env.EMAIL_FROM_NAME || "HermanCoach";
const fromAddress = process.env.EMAIL_FROM_ADDRESS || "";
const coachLinkSubject = process.env.COACH_LINK_EMAIL_SUBJECT || "Your Personal HermanCoach Link";

function fromHeader() {
  if (!fromAddress) {
    return "";
  }
  return `${fromName} <${fromAddress}>`;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!resendApiKey || !fromAddress) {
    console.log("[email:dev]", {
      to,
      subject,
      text,
    });
    return { delivered: false, devMode: true };
  }

  const response = await fetch(`${resendApiBaseUrl}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromHeader(),
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function sendCoachLinkEmail({ to, firstName, coachUrl, confirmationUrl }) {
  const safeFirstName = escapeHtml(firstName || "");
  const safeCoachUrl = escapeHtml(coachUrl);
  const safeConfirmationUrl = confirmationUrl ? escapeHtml(confirmationUrl) : "";
  const greeting = safeFirstName ? `Hi ${safeFirstName},` : "Hi,";
  const confirmationLine = confirmationUrl
    ? `<p><a href="${safeConfirmationUrl}">Click this link to confirm your email</a> so your contest entry is eligible to win.</p>`
    : "";
  const confirmationText = confirmationUrl
    ? `\nConfirm your email so your contest entry is eligible to win: ${confirmationUrl}\n`
    : "";

  return sendEmail({
    to,
    subject: coachLinkSubject,
    html: `
      <p>${greeting}</p>
      <p>Your personal HermanCoach link is ready:</p>
      <p><a href="${safeCoachUrl}">Click this link to open your personal coach</a></p>
      ${confirmationLine}
      <p>Keep this link handy. It opens your Prompt Structure Coach directly.</p>
    `,
    text: `${greeting}

Your personal HermanCoach link is ready:
${coachUrl}
${confirmationText}
Keep this link handy. It opens your Prompt Structure Coach directly.`,
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendAdminCodeEmail({ to, code }) {
  return sendEmail({
    to,
    subject: "Your HermanCoach admin login code",
    html: `
      <p>Your HermanCoach admin login code is:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.12em;">${code}</p>
      <p>This code expires soon. If you did not request it, you can ignore this email.</p>
    `,
    text: `Your HermanCoach admin login code is: ${code}`,
  });
}
