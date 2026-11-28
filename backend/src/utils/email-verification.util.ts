import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000; // a code works for 10 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000; // one new code per minute
export const MAX_ATTEMPTS = 5; // wrong guesses before a new code is needed
// Sign-up has many steps after the code; the proof of verification lasts long enough to finish them
const VERIFIED_TOKEN_TTL = '3h';
const TOKEN_PURPOSE = 'signup-email';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

export const generateCode = () => crypto.randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, '0');

/** Same rules as the sign-up form, enforced on the server so they can't be skipped */
export const STRONG_PASSWORD_MESSAGE =
  'For your security, please choose a strong password with at least 8 characters, including a mix of uppercase letters, numbers, and symbols.';
export const isStrongPassword = (password: unknown): password is string =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password);

// Codes are stored hashed so a database leak doesn't expose live codes.
// `purpose` keeps a sign-up code from working as a password-reset code and vice versa.
export type CodePurpose = 'signup' | 'reset';
export const hashCode = (email: string, code: string, purpose: CodePurpose = 'signup') =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET!)
    .update(purpose === 'signup' ? `${email}:${code}` : `${purpose}:${email}:${code}`)
    .digest('hex');

export const codeMatches = (email: string, code: string, storedHash: string, purpose: CodePurpose = 'signup') => {
  const given = Buffer.from(hashCode(email, code, purpose), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
};

/** Short-lived proof that this email passed the code check; required by /register */
export const signVerifiedEmailToken = (email: string) =>
  jwt.sign({ email, purpose: TOKEN_PURPOSE }, process.env.JWT_SECRET!, { expiresIn: VERIFIED_TOKEN_TTL });

export const verifiedEmailFromToken = (token: unknown): string | null => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { email?: string; purpose?: string };
    return payload.purpose === TOKEN_PURPOSE && payload.email ? payload.email : null;
  } catch {
    return null;
  }
};

// Password reset: proof that the code check passed. Valid for 15 minutes and only until the
// password changes (it carries a fingerprint of the current password hash), so it works once.
const RESET_TOKEN_TTL = '15m';
const RESET_PURPOSE = 'password-reset';
const passwordFingerprint = (passwordHash: string) =>
  crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);

export const signPasswordResetToken = (userId: string, passwordHash: string) =>
  jwt.sign({ userId, pwf: passwordFingerprint(passwordHash), purpose: RESET_PURPOSE }, process.env.JWT_SECRET!, {
    expiresIn: RESET_TOKEN_TTL,
  });

export const readPasswordResetToken = (token: unknown): { userId: string; pwf: string } | null => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string; pwf?: string; purpose?: string };
    return payload.purpose === RESET_PURPOSE && payload.userId && payload.pwf
      ? { userId: payload.userId, pwf: payload.pwf }
      : null;
  } catch {
    return null;
  }
};

export const resetTokenMatchesPassword = (pwf: string, passwordHash: string) => passwordFingerprint(passwordHash) === pwf;

const MINUTES = CODE_TTL_MS / 60000;

const emailLayout = (title: string, intro: string, code: string, footer: string) => `<!doctype html>
<html><body style="margin:0;background:#0b0d10;font-family:Arial,Helvetica,sans-serif;color:#f3f4f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#16191f;border-radius:16px;padding:32px">
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:8px">${title}</td></tr>
        <tr><td style="font-size:14px;color:#9ca3af;padding-bottom:24px">${intro}</td></tr>
        <tr><td align="center" style="font-size:34px;letter-spacing:10px;font-weight:bold;background:#2a2e35;border-radius:12px;padding:16px 0">${code}</td></tr>
        <tr><td style="font-size:13px;color:#9ca3af;padding-top:24px">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export const codeEmail = (code: string) => {
  const footer = `The code expires in ${MINUTES} minutes. If you didn't try to create a Cinephile account, you can ignore this email.`;
  return {
    subject: `${code} is your Cinephile verification code`,
    text: `Your Cinephile verification code is ${code}.\n\n${footer}`,
    html: emailLayout('Verify your email', 'Enter this code in Cinephile to finish creating your account.', code, footer),
  };
};

export const resetCodeEmail = (code: string) => {
  const footer = `The code expires in ${MINUTES} minutes. If you didn't ask to reset your password, you can ignore this email and your password won't change.`;
  return {
    subject: `${code} is your Cinephile password reset code`,
    text: `Your Cinephile password reset code is ${code}.\n\n${footer}`,
    html: emailLayout('Reset your password', 'Enter this code in Cinephile to choose a new password.', code, footer),
  };
};
