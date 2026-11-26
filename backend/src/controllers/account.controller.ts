import { Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { removeStoredPhoto } from '../utils/photo-storage.util';

const prisma = new PrismaClient();

/**
 * Permanently delete the signed-in account. Requires the current password, so someone holding an
 * unlocked phone can't do it. Deleting the user removes their profile, likes, passes, matches,
 * messages and reactions (all cascade in the database); their profile photos and every photo sent
 * in their chats are then removed from storage. Reports about or by them are kept for safety,
 * without the link to the account.
 * @route POST /api/account/delete  { password }
 */
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const password = req.body?.password;
    if (!userId) {
      return res.status(401).json({ error: 'Please log in' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Please enter your password' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, profile: { select: { photos: true } } },
    });
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'That password isn’t right' });
    }

    // Photos to remove from storage once the database rows are gone
    const chatPhotos = await prisma.message.findMany({
      where: {
        imageUrl: { not: null },
        match: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      },
      select: { imageUrl: true },
    });
    const photoUrls = [...(user.profile?.photos ?? []), ...chatPhotos.map((m) => m.imageUrl as string)];

    await prisma.user.delete({ where: { id: userId } });

    // Storage cleanup never blocks the deletion: failures are only logged
    await Promise.all(photoUrls.map((url) => removeStoredPhoto(url)));

    // Sign out any other open sessions of this account
    req.app.get('io')?.in(`user:${userId}`).disconnectSockets(true);

    console.log(`[DeleteAccount] Deleted account ${userId}`);
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
};
