import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { defaultAgeRange, parseBirthday, ageFromBirthday, MIN_DATING_AGE } from '../utils/age-range.util';

const prisma = new PrismaClient();
const googleClient = new OAuth2Client();

const authResponse = (user: { id: string; email: string; profile: unknown }) => ({
  token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' }),
  user: { id: user.id, email: user.email, profile: user.profile },
});

// Checks the details every new account needs and builds its starting profile.
// Age always comes from the birthday, never from a number the client sends.
const buildNewProfile = (body: any): { error: string } | { profile: any } => {
  const { name, gender } = body;
  if (!name || typeof name !== 'string' || !name.trim() || !body.birthday || !gender) {
    return { error: 'All fields are required' };
  }

  const birthday = parseBirthday(body.birthday);
  if (!birthday) return { error: 'Please enter a real birthday' };
  const age = ageFromBirthday(birthday);
  if (age < MIN_DATING_AGE) return { error: `You must be at least ${MIN_DATING_AGE} to use MatchFlix` };
  if (age > 100) return { error: 'Please enter a valid birthday' };

  return {
    profile: {
      name: name.trim(),
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
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Same password rules as the sign-up form, enforced here so they can't be skipped
    const strongPassword =
      typeof password === 'string' &&
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9\s]/.test(password);
    if (!strongPassword) {
      return res.status(400).json({
        error: 'For your security, please choose a strong password with at least 8 characters, including a mix of uppercase letters, numbers, and symbols.',
      });
    }

    const newProfile = buildNewProfile(req.body);
    if ('error' in newProfile) {
      return res.status(400).json({ error: newProfile.error });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        profile: { create: newProfile.profile },
      },
      include: { profile: true },
    });

    res.status(201).json(authResponse(user));
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

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(authResponse(user));
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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    res.json({ exists: !!existingUser });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};

// Short-lived proof that Google confirmed this person, carried through the sign-up steps
const GOOGLE_SIGNUP_PURPOSE = 'google-signup';

type GoogleIdentity = { googleId: string; email: string; name?: string };

const verifyGoogleCredential = async (credential: unknown): Promise<GoogleIdentity | null> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  if (!credential || typeof credential !== 'string') return null;

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) return null;
    return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name };
  } catch {
    return null;
  }
};

const findUserByEmail = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

// Signs in with a Google ID token. Existing accounts get a session right away;
// new people get a sign-up token to finish their profile with.
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const identity = await verifyGoogleCredential(req.body.credential);
    if (!identity) {
      return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
    }

    let user = await prisma.user.findUnique({
      where: { googleId: identity.googleId },
      include: { profile: true },
    });

    if (!user) {
      // An email account with the same address: Google has verified the address, so link the two
      const emailUser = await findUserByEmail(identity.email);
      if (emailUser) {
        user = await prisma.user.update({
          where: { id: emailUser.id },
          data: { googleId: identity.googleId },
          include: { profile: true },
        });
      }
    }

    if (user) {
      return res.json(authResponse(user));
    }

    const signupToken = jwt.sign(
      { purpose: GOOGLE_SIGNUP_PURPOSE, googleId: identity.googleId, email: identity.email },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    res.json({
      needsProfile: true,
      signupToken,
      email: identity.email,
      name: identity.name || '',
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
};

// Creates the account for someone who started sign-up with Google
export const completeGoogleSignup = async (req: Request, res: Response) => {
  try {
    let claims: any;
    try {
      claims = jwt.verify(req.body.signupToken, process.env.JWT_SECRET!);
    } catch {
      return res.status(401).json({ error: 'Your Google sign-up expired. Please continue with Google again.' });
    }
    if (claims?.purpose !== GOOGLE_SIGNUP_PURPOSE || !claims.googleId || !claims.email) {
      return res.status(401).json({ error: 'Invalid sign-up token' });
    }

    const newProfile = buildNewProfile(req.body);
    if ('error' in newProfile) {
      return res.status(400).json({ error: newProfile.error });
    }

    const existingUser =
      (await prisma.user.findUnique({ where: { googleId: claims.googleId } })) ||
      (await findUserByEmail(claims.email));
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const user = await prisma.user.create({
      data: {
        email: claims.email,
        googleId: claims.googleId,
        profile: { create: newProfile.profile },
      },
      include: { profile: true },
    });

    res.status(201).json(authResponse(user));
  } catch (error) {
    console.error('Google sign-up error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
