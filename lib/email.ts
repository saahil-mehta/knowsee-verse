interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailOptions): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const from =
    process.env.MAILGUN_FROM?.trim() || `Knowsee <noreply@${domain}>`;

  if (!apiKey || !domain) {
    console.error("[email] Mailgun credentials missing", {
      hasApiKey: !!apiKey,
      hasDomain: !!domain,
    });
    throw new Error("Mailgun credentials not configured");
  }

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
