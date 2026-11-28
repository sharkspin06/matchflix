import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { defaultAgeRange, parseBirthday, ageFromBirthday, MIN_DATING_AGE } from '../utils/age-range.util';
import { sendEmail } from '../utils/mailer.util';
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  STRONG_PASSWORD_MESSAGE,
  codeEmail,
  codeMatches,
  generateCode,
  hashCode,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  readPasswordResetToken,
  resetCodeEmail,
  resetTokenMatchesPassword,
  signPasswordResetToken,
  signVerifiedEmailToken,
  verifiedEmailFromToken,
} from '../utils/email-verification.util';

const prisma = new PrismaClient();

// Case-insensitive so "Me@Gmail.com" and "me@gmail.com" count as the same account
const findUserByEmail = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } });

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, gender } = req.body;

    // Validation
    if (!email || !password || !name || !req.body.birthday || !gender) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Same password rules as the sign-up form, enforced here so they can't be skipped
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: STRONG_PASSWORD_MESSAGE });
    }

    // Age always comes from the birthday, never from a number the client sends
    const birthday = parseBirthday(req.body.birthday);
    if (!birthday) {
      return res.status(400).json({ error: 'Please enter a real birthday' });
    }
    const age = ageFromBirthday(birthday);
    if (age < MIN_DATING_AGE) {
      return res.status(400).json({ error: `You must be at least ${MIN_DATING_AGE} to use Cinephile` });
    }
    if (age > 100) {
      return res.status(400).json({ error: 'Please enter a valid birthday' });
    }

    // The email must have passed the code check (see sendSignupCode / verifySignupCode)
    if (verifiedEmailFromToken(req.body.emailVerificationToken) !== normalizeEmail(String(email))) {
      return res.status(400).json({
        error: 'Please verify your email before creating your account.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(String(email));

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        profile: {
          create: {
            name,
            age,
            birthday,
            gender,
            bio: '',
            location: '',
            photos: [],
            interests: [],
            // Registration replaces this with the person's own choice right after
            preferredGender: gender === 'woman' ? ['man'] : ['woman'],
            ...defaultAgeRange(age),
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await findUserByEmail(email);

    res.json({ exists: !!existingUser });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};

/** Emails a 6-digit code to an address that isn't registered yet */
export const sendSignupCode = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ''));
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (pending) {
      const waitMs = pending.createdAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
      if (waitMs > 0) {
        const retryAfter = Math.ceil(waitMs / 1000);
        return res.status(429).json({ error: `Please wait ${retryAfter}s before requesting a new code`, retryAfter });
      }
    }

    const code = generateCode();
    const record = {
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
      createdAt: new Date(),
    };
    await prisma.emailVerification.upsert({ where: { email }, create: { email, ...record }, update: record });

    try {
      await sendEmail({ to: email, ...codeEmail(code) });
    } catch (mailError) {
      console.error('Send signup code email error:', mailError);
      // Let them try again right away instead of waiting out the cooldown for an email that never went
      await prisma.emailVerification.delete({ where: { email } }).catch(() => {});
      return res.status(502).json({ error: "We couldn't send the code right now. Please try again." });
    }

    res.json({
      sent: true,
      codeLength: CODE_LENGTH,
      expiresInSeconds: CODE_TTL_MS / 1000,
      resendInSeconds: RESEND_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    console.error('Send signup code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

/** Checks the emailed code; on success returns the token /register needs */
export const verifySignupCode = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ''));
    const code = String(req.body.code || '').trim();
    if (!isValidEmail(email) || !new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code)) {
      return res.status(400).json({ error: `Enter the ${CODE_LENGTH}-digit code from your email` });
    }

    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.', code: 'CODE_EXPIRED' });
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many wrong attempts. Please request a new code.', code: 'TOO_MANY_ATTEMPTS' });
    }

    if (!codeMatches(email, code, pending.codeHash)) {
      const updated = await prisma.emailVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      return res.status(400).json({
        error: attemptsLeft > 0
          ? `That code isn't right. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`
          : 'Too many wrong attempts. Please request a new code.',
        code: attemptsLeft > 0 ? 'WRONG_CODE' : 'TOO_MANY_ATTEMPTS',
        attemptsLeft,
      });
    }

    await prisma.emailVerification.delete({ where: { email } });
    res.json({ verified: true, emailVerificationToken: signVerifiedEmailToken(email) });
  } catch (error) {
    console.error('Verify signup code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
};

/*
  Forgot password: email a code -> check the code -> set a new password.
  Shares the email_verifications table with sign-up codes. Sign-up codes only exist for
  unregistered emails and reset codes only for registered ones, and the hash includes
  the purpose, so one kind of code can never be used as the other.
*/

/** Emails a reset code. Answers the same whether or not the account exists. */
export const sendPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ''));
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const genericReply = {
      sent: true,
      codeLength: CODE_LENGTH,
      expiresInSeconds: CODE_TTL_MS / 1000,
      resendInSeconds: RESEND_COOLDOWN_MS / 1000,
    };

    const user = await findUserByEmail(email);
    if (!user) return res.json(genericReply);

    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (pending) {
      const waitMs = pending.createdAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
      if (waitMs > 0) {
        const retryAfter = Math.ceil(waitMs / 1000);
        return res.status(429).json({ error: `Please wait ${retryAfter}s before requesting a new code`, retryAfter });
      }
    }

    const code = generateCode();
    const record = {
      codeHash: hashCode(email, code, 'reset'),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
      createdAt: new Date(),
    };
    await prisma.emailVerification.upsert({ where: { email }, create: { email, ...record }, update: record });

    try {
      await sendEmail({ to: email, ...resetCodeEmail(code) });
    } catch (mailError) {
      console.error('Send password reset email error:', mailError);
      await prisma.emailVerification.delete({ where: { email } }).catch(() => {});
      return res.status(502).json({ error: "We couldn't send the code right now. Please try again." });
    }

    res.json(genericReply);
  } catch (error) {
    console.error('Send password reset code error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
};

/** Checks the reset code; on success returns a short-lived token for setting the new password */
export const verifyPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ''));
    const code = String(req.body.code || '').trim();
    if (!isValidEmail(email) || !new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code)) {
      return res.status(400).json({ error: `Enter the ${CODE_LENGTH}-digit code from your email` });
    }

    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.', code: 'CODE_EXPIRED' });
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many wrong attempts. Please request a new code.', code: 'TOO_MANY_ATTEMPTS' });
    }

    const user = await findUserByEmail(email);
    if (!user || !codeMatches(email, code, pending.codeHash, 'reset')) {
      const updated = await prisma.emailVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      return res.status(400).json({
        error: attemptsLeft > 0
          ? `That code isn't right. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`
          : 'Too many wrong attempts. Please request a new code.',
        code: attemptsLeft > 0 ? 'WRONG_CODE' : 'TOO_MANY_ATTEMPTS',
        attemptsLeft,
      });
    }

    await prisma.emailVerification.delete({ where: { email } });
    res.json({ verified: true, resetToken: signPasswordResetToken(user.id, user.password) });
  } catch (error) {
    console.error('Verify password reset code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
};

/** Sets the new password using the token from verifyPasswordResetCode (works once) */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;
    const reset = readPasswordResetToken(resetToken);
    const expired = {
      error: 'Your reset session has expired. Please request a new code.',
      code: 'RESET_EXPIRED',
    };
    if (!reset) return res.status(400).json(expired);

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: STRONG_PASSWORD_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { id: reset.userId } });
    // The token stops working once the password has changed, so it can't be replayed
    if (!user || !resetTokenMatchesPassword(reset.pwf, user.password)) {
      return res.status(400).json(expired);
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ error: 'Your new password must be different from your old one.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
