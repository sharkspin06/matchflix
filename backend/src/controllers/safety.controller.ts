import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const REPORT_REASONS = ['child_safety', 'fake', 'inappropriate', 'harassment', 'scam', 'underage', 'other'] as const;
const MAX_DETAILS_LENGTH = 1000;
// Most recent messages saved with a report, so it can still be reviewed after the chat is removed
const EVIDENCE_MESSAGES = 50;

/** Everyone this user has blocked or been blocked by. Neither side should see the other anywhere. */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return Boolean(block);
}

/** Blocks and removes everything connecting the two: their match (with its messages) and likes. */
async function blockAndCutTies(blockerId: string, blockedId: string) {
  const [user1Id, user2Id] = [blockerId, blockedId].sort();
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    }),
    prisma.match.deleteMany({ where: { user1Id, user2Id } }),
    prisma.like.deleteMany({
      where: {
        OR: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId },
        ],
      },
    }),
  ]);
}

// Shared checks for both actions: a real, different user
async function validTarget(req: AuthRequest, res: Response): Promise<{ me: string; them: string } | null> {
  const me = req.userId;
  const them = req.params.userId;
  if (!me) {
    res.status(401).json({ error: 'Please log in' });
    return null;
  }
  if (!them || them === me) {
    res.status(400).json({ error: 'Invalid user' });
    return null;
  }
  const exists = await prisma.user.findUnique({ where: { id: them }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  return { me, them };
}

/**
 * Block a user. Their match and messages with you are removed and neither of you sees the other
 * again. They aren't told.
 * @route POST /api/safety/block/:userId
 */
export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const ids = await validTarget(req, res);
    if (!ids) return;
    await blockAndCutTies(ids.me, ids.them);
    res.json({ blocked: true });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

/**
 * Report a user for review, then block them. Recent messages are saved with the report
 * before the chat is removed. They aren't told who reported them.
 * @route POST /api/safety/report/:userId  { reason, details? }
 */
export const reportUser = async (req: AuthRequest, res: Response) => {
  try {
    const reason = req.body?.reason;
    const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Please choose a reason' });
    }
    if (details.length > MAX_DETAILS_LENGTH) {
      return res.status(400).json({ error: `Please keep details under ${MAX_DETAILS_LENGTH} characters` });
    }

    const ids = await validTarget(req, res);
    if (!ids) return;

    const [user1Id, user2Id] = [ids.me, ids.them].sort();
    const [reportedProfile, match] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: ids.them }, select: { name: true } }),
      prisma.match.findFirst({ where: { user1Id, user2Id }, select: { id: true } }),
    ]);
    const evidence = match
      ? (
          await prisma.message.findMany({
            where: { matchId: match.id },
            orderBy: { createdAt: 'desc' },
            take: EVIDENCE_MESSAGES,
            select: { senderId: true, content: true, imageUrl: true, createdAt: true },
          })
        ).reverse()
      : [];

    await prisma.report.create({
      data: {
        reporterId: ids.me,
        reportedId: ids.them,
        reportedName: reportedProfile?.name ?? null,
        reason,
        details: details || null,
        evidence: evidence.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      },
    });
    await blockAndCutTies(ids.me, ids.them);

    res.status(201).json({ reported: true, blocked: true });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ error: 'Failed to send report' });
  }
};
