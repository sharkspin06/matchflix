/**
 * Sends email over HTTPS (Render's free plan blocks outgoing SMTP). Uses the first one configured:
 *
 * 1. Gmail via Google Apps Script (backend/scripts/gmail-mailer.gs), ~100 emails/day on free Gmail
 *      GMAIL_SCRIPT_URL     - the script's Web app URL (ends in /exec)
 *      GMAIL_SCRIPT_SECRET  - same value as the script's SECRET property
 *
 * 2. Brevo's HTTP API (https://www.brevo.com)
 *      BREVO_API_KEY, MAIL_FROM (a sender verified in Brevo)
 *
 * MAIL_FROM_NAME (optional) sets the sender name, default "Cinephile".
 * With neither configured outside production, the email is printed to the server log
 * so sign-up can still be tested locally.
 */
interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const fromName = () => process.env.MAIL_FROM_NAME || 'Cinephile';

const sendWithGmailScript = async (url: string, secret: string, { to, subject, html, text }: Email) => {
  // Apps Script answers a POST with a redirect to the result; fetch follows it
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, to, subject, html, text, fromName: fromName() }),
  });
  const raw = await response.text();
  let result: { ok?: boolean; error?: string } = {};
  try {
    result = JSON.parse(raw);
  } catch {
    // An HTML page here usually means the deployment isn't set to "Anyone" or the URL is wrong
    throw new Error(`Gmail script returned ${response.status} (not JSON): ${raw.slice(0, 200)}`);
  }
  if (!response.ok || !result.ok) {
    throw new Error(`Gmail script error: ${result.error || response.status}`);
  }
};

const sendWithBrevo = async (apiKey: string, from: string, { to, subject, html, text }: Email) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: from, name: fromName() },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo responded ${response.status}: ${detail.slice(0, 300)}`);
  }
};

export const sendEmail = async (email: Email) => {
  const { GMAIL_SCRIPT_URL, GMAIL_SCRIPT_SECRET, BREVO_API_KEY, MAIL_FROM } = process.env;

  if (GMAIL_SCRIPT_URL && GMAIL_SCRIPT_SECRET) {
    return sendWithGmailScript(GMAIL_SCRIPT_URL, GMAIL_SCRIPT_SECRET, email);
  }
  if (BREVO_API_KEY && MAIL_FROM) {
    return sendWithBrevo(BREVO_API_KEY, MAIL_FROM, email);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Email sending is not configured (set GMAIL_SCRIPT_URL/GMAIL_SCRIPT_SECRET or BREVO_API_KEY/MAIL_FROM)');
  }
  console.log(`\n[mailer] Email not configured, printing instead\nTo: ${email.to}\nSubject: ${email.subject}\n${email.text}\n`);
};
