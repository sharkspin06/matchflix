import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 254;
const DEVICES = ['android', 'ios'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    await prisma.betaSignup.upsert({
      where: { email },
      create: { email, name, device },
      update: { name, device },
    });
    res.json({ joined: true });
  } catch (error) {
    console.error('Beta signup error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
