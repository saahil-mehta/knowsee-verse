import { getConfig } from "@/lib/config";

interface SendEmailOptions {
  subject: string;
  text: string;
  to: string;
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailOptions): Promise<void> {
  const { email } = getConfig();
  const apiKey = email.mailgunApiKey;
  const domain = email.mailgunDomain;
  const from = email.mailgunFrom || `Knowsee <noreply@${domain}>`;

  console.log("[email] Sending to %s via %s", to, domain);

  const response = await fetch(
    `https://api.eu.mailgun.net/v3/${domain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ from, to, subject, text }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(
      "[email] Mailgun error %d: %s (domain: %s)",
      response.status,
      error,
      domain
    );
    throw new Error(
      `Failed to send email: ${response.status} ${error} (domain: ${domain})`
    );
  }

  console.log("[email] Sent successfully to %s", to);
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Your Knowsee verification code",
    text: `Your Knowsee verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  });
}
