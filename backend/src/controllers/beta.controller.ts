import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../utils/mailer.util';

const prisma = new PrismaClient();

const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 254;
const DEVICES = ['android', 'ios'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Emails BETA_NOTIFY_EMAIL about a new sign-up. Does nothing when that variable isn't set. */
const notifyNewSignup = async (name: string, email: string, device: string) => {
  const to = process.env.BETA_NOTIFY_EMAIL;
  if (!to) return;
  const total = await prisma.betaSignup.count();
  const deviceLabel = device === 'ios' ? 'iOS' : 'Android';
  await sendEmail({
    to,
    subject: `New beta sign-up: ${name}`,
    text: `Someone joined the Cinephile beta.

Name: ${name}
Email: ${email}
Device: ${deviceLabel}

Total sign-ups: ${total}`,
    html: `<p>Someone joined the Cinephile beta.</p>
<p><b>Name:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(email)}<br><b>Device:</b> ${deviceLabel}</p>
<p>Total sign-ups: ${total}</p>`,
  });
};

/** Adds a website visitor to the beta list. Signing up again with the same email just updates the name and device. */
export const joinBeta = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const device = req.body?.device;

  if (!name || name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: 'Please enter your name or nickname.' });
  }
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!DEVICES.includes(device)) {
    return res.status(400).json({ error: 'Please choose your mobile device.' });
  }

  try {
    const existing = await prisma.betaSignup.findUnique({ where: { email }, select: { id: true } });
    await prisma.betaSignup.upsert({
      where: { email },
      create: { email, name, device },
      update: { name, device },
    });
    res.json({ joined: true });

    // Only for first-time sign-ups; a failed email shouldn't affect the visitor
    if (!existing) {
      notifyNewSignup(name, email, device).catch((error) => console.error('Beta signup notify error:', error));
    }
  } catch (error) {
    console.error('Beta signup error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
