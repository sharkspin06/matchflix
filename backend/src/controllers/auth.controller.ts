import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { defaultAgeRange, parseBirthday, ageFromBirthday, MIN_DATING_AGE } from '../utils/age-range.util';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, gender } = req.body;

    // Validation
    if (!email || !password || !name || !req.body.birthday || !gender) {
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    res.json({ exists: !!existingUser });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};
