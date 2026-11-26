import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { savePhoto, removeStoredPhoto } from '../utils/photo-storage.util';
import { ageFromBirthday, parseBirthday, MIN_DATING_AGE } from '../utils/age-range.util';
import { parseCoordinates } from '../utils/location.util';
import { parseLetterboxdUsername } from '../utils/letterboxd.util';

const prisma = new PrismaClient();

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Keep the stored age in step with the birthday as years pass
    if (profile.birthday) {
      const currentAge = ageFromBirthday(profile.birthday);
      if (currentAge !== profile.age) {
        const updated = await prisma.profile.update({ where: { userId: req.userId }, data: { age: currentAge } });
        return res.json(updated);
      }
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      birthday,
      gender,
      sexualOrientation,
      bio,
      location,
      latitude,
      longitude,
      zodiac,
      education,
      pets,
      drinkingHabits,
      smokingHabits,
      interests,
      topFilms,
      relationshipGoals,
      preferredGender,
      preferredAgeMin,
      preferredAgeMax,
      preferredDistance,
    } = req.body;

    console.log('=== UPDATE PROFILE REQUEST ===');
    console.log('Received topFilms:', topFilms);
    console.log('Received interests:', interests);
    console.log('Received zodiac:', zodiac);
    console.log('Received education:', education);
    console.log('Full request body:', req.body);

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    // Age is never set directly; it always comes from the birthday
    if (birthday !== undefined) {
      const parsed = parseBirthday(birthday);
      if (!parsed) {
        return res.status(400).json({ error: 'Please enter a real birthday' });
      }
      const newAge = ageFromBirthday(parsed);
      if (newAge < MIN_DATING_AGE) {
        return res.status(400).json({ error: `You must be at least ${MIN_DATING_AGE} to use Cinephile` });
      }
      if (newAge > 100) {
        return res.status(400).json({ error: 'Please enter a valid birthday' });
      }
      updateData.birthday = parsed;
      updateData.age = newAge;
    }
    if (gender !== undefined) updateData.gender = gender;
    if (sexualOrientation !== undefined) {
      const allowed = ['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'queer', 'asexual', 'demisexual', 'questioning', 'prefer-not-to-say'];
      if (!Array.isArray(sexualOrientation) || sexualOrientation.some((o: unknown) => !allowed.includes(o as string))) {
        return res.status(400).json({ error: 'Please choose a sexual orientation from the list' });
      }
      // One orientation per person (stored as a list so the column can grow later)
      updateData.sexualOrientation = (sexualOrientation as string[]).slice(0, 1);
    }
    if (bio !== undefined) updateData.bio = bio;
    if (req.body.letterboxdUsername !== undefined) {
      const letterboxd = parseLetterboxdUsername(req.body.letterboxdUsername);
      if (!letterboxd.ok) {
        return res.status(400).json({ error: letterboxd.error });
      }
      updateData.letterboxdUsername = letterboxd.username;
    }
    if (location !== undefined) updateData.location = location;
    if (latitude !== undefined || longitude !== undefined) {
      // Validated, then snapped to a ~1 km grid so exact positions are never stored
      const coords = parseCoordinates(latitude, longitude);
      if (!coords.ok) {
        return res.status(400).json({ error: coords.error });
      }
      updateData.latitude = coords.latitude;
      updateData.longitude = coords.longitude;
    }
    if (zodiac !== undefined) updateData.zodiac = zodiac;
    if (education !== undefined) updateData.education = education;
    if (pets !== undefined) updateData.pets = pets;
    if (drinkingHabits !== undefined) updateData.drinkingHabits = drinkingHabits;
    if (smokingHabits !== undefined) updateData.smokingHabits = smokingHabits;
    if (interests !== undefined) updateData.interests = interests;
    if (topFilms !== undefined) updateData.topFilms = topFilms;
    if (relationshipGoals !== undefined) updateData.relationshipGoals = relationshipGoals;
    if (preferredGender !== undefined) updateData.preferredGender = preferredGender;
    if (preferredAgeMin !== undefined) updateData.preferredAgeMin = parseInt(preferredAgeMin);
    if (preferredAgeMax !== undefined) updateData.preferredAgeMax = parseInt(preferredAgeMax);
    if (preferredDistance !== undefined) updateData.preferredDistance = parseInt(preferredDistance);

    const profile = await prisma.profile.update({
      where: { userId: req.userId },
      data: updateData,
    });

    console.log(`[UpdateProfile] Updated profile for user ${req.userId}`);

    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const photoUrl = await savePhoto(req.file);

    // Delete old profile picture from storage if it exists
    if (profile.photos.length > 0) {
      await removeStoredPhoto(profile.photos[0]);
    }

    // Replace the first photo (profile picture) or add if no photos exist
    const updatedPhotos = profile.photos.length > 0 
      ? [photoUrl, ...profile.photos.slice(1)]  // Replace first photo, keep the rest
      : [photoUrl];  // Add first photo if none exist

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        photos: updatedPhotos,
      },
    });

    res.json({ photoUrl, photos: updatedProfile.photos });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

export const addPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const photoUrl = await savePhoto(req.file);

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        photos: { push: photoUrl },
      },
    });

    res.json({ photoUrl, photos: updatedProfile.photos });
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ error: 'Failed to add photo' });
  }
};

export const deletePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const { photoUrl } = req.body;

    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await removeStoredPhoto(photoUrl);

    // Remove from database
    const updatedPhotos = profile.photos.filter((photo) => photo !== photoUrl);

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        photos: updatedPhotos,
      },
    });

    res.json({ photos: updatedProfile.photos });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};
