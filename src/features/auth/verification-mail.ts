import "server-only";

function deliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.AUTH_EMAIL_FROM?.trim();
  return apiKey && sender ? { apiKey, sender } : undefined;
}

export function verificationEmailEnabled() {
  return Boolean(deliveryConfig());
}

export async function sendVerificationMail({ user, url }: { user: { email: string }; url: string }) {
  const config = deliveryConfig();
  if (!config) throw new Error("Verification email delivery is unavailable.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.sender,
      to: [user.email],
      subject: "Verify your ToolNest Pro email address",
      text: `Verify your ToolNest Pro email address using this link:\n\n${url}\n\nThe link expires in one hour. If you did not request it, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Verification email delivery failed.");
}
