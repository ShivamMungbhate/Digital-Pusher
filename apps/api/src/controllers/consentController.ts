import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { Consent, ShareLevel, AlertThreshold } from '../models/Consent.js';
import { AuditLog } from '../models/AuditLog.js';

export const createInviteSchema = z.object({
  body: z
    .object({
      shareLevel: z.enum(['summary', 'summary_and_media']).default('summary'),
      alertThreshold: z.enum(['medium', 'high']).default('medium')
    })
    .optional()
});

export const linkInviteSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(4, 'Invite code is required').trim().toUpperCase()
  })
});

export const updateConsentSchema = z.object({
  body: z.object({
    shareLevel: z.enum(['summary', 'summary_and_media']).optional(),
    alertThreshold: z.enum(['medium', 'high']).optional()
  })
});

export const generateInviteCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role !== 'senior') {
      throw new AppError('Only seniors can generate family invite codes', 403, 'FORBIDDEN');
    }

    const { shareLevel = 'summary', alertThreshold = 'medium' } = req.body || {};

    // Generate a human-friendly 6-character alphanumeric code
    const rawCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const inviteCode = `DP-${rawCode}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const consent = await Consent.create({
      seniorId: user._id,
      inviteCode,
      inviteExpiresAt: expiresAt,
      status: 'pending',
      shareLevel: shareLevel as ShareLevel,
      alertThreshold: alertThreshold as AlertThreshold
    });

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_INVITE_GENERATED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      details: { inviteCode }
    });

    res.status(201).json({
      message: 'Invite code created successfully',
      consent: {
        id: consent._id,
        inviteCode: consent.inviteCode,
        expiresAt: consent.inviteExpiresAt,
        status: consent.status,
        shareLevel: consent.shareLevel,
        alertThreshold: consent.alertThreshold
      }
    });
  } catch (err) {
    next(err);
  }
};

export const linkWithCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role !== 'family') {
      throw new AppError('Only family members can link using invite codes', 403, 'FORBIDDEN');
    }

    const { inviteCode } = req.body;

    const consent = await Consent.findOne({
      inviteCode: inviteCode.toUpperCase(),
      status: 'pending'
    });

    if (!consent) {
      throw new AppError('Invalid or expired invite code', 404, 'INVITE_NOT_FOUND');
    }

    if (consent.inviteExpiresAt < new Date()) {
      throw new AppError('This invite code has expired', 400, 'INVITE_EXPIRED');
    }

    if (consent.seniorId.toString() === user._id.toString()) {
      throw new AppError('You cannot link with yourself', 400, 'SELF_LINK_INVALID');
    }

    // Attach family member to pending consent
    consent.familyId = user._id;
    await consent.save();

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_LINK_REQUESTED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      details: { seniorId: consent.seniorId }
    });

    res.json({
      message: 'Link request submitted. Awaiting approval from senior.',
      consent: {
        id: consent._id,
        seniorId: consent.seniorId,
        status: consent.status,
        shareLevel: consent.shareLevel,
        alertThreshold: consent.alertThreshold
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getConsents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role === 'senior') {
      const consents = await Consent.find({
        seniorId: user._id,
        status: { $ne: 'rejected' }
      })
        .populate('familyId', 'name email phone')
        .sort({ createdAt: -1 });

      res.json({ consents });
    } else {
      // Family member: show active links
      const consents = await Consent.find({
        familyId: user._id,
        status: 'active'
      })
        .populate('seniorId', 'name email phone preferredLanguage')
        .sort({ createdAt: -1 });

      res.json({ consents });
    }
  } catch (err) {
    next(err);
  }
};

export const acceptConsent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const consent = await Consent.findOne({
      _id: id,
      seniorId: user._id
    });

    if (!consent) {
      throw new AppError('Consent request not found', 404, 'NOT_FOUND');
    }

    if (!consent.familyId) {
      throw new AppError('No family member has joined this invite code yet', 400, 'NO_FAMILY_JOINED');
    }

    if (consent.status === 'active') {
      res.json({ message: 'Consent is already active', consent });
      return;
    }

    consent.status = 'active';
    consent.acceptedAt = new Date();
    await consent.save();

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_ACCEPTED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      details: { familyId: consent.familyId }
    });

    res.json({
      message: 'Family link accepted successfully',
      consent
    });
  } catch (err) {
    next(err);
  }
};

export const rejectConsent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const consent = await Consent.findOne({
      _id: id,
      seniorId: user._id
    });

    if (!consent) {
      throw new AppError('Consent request not found', 404, 'NOT_FOUND');
    }

    consent.status = 'rejected';
    await consent.save();

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_REJECTED',
      resourceType: 'Consent',
      resourceId: consent._id.toString()
    });

    res.json({ message: 'Consent link rejected', consent });
  } catch (err) {
    next(err);
  }
};

export const updateConsent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { shareLevel, alertThreshold } = req.body;

    const consent = await Consent.findOne({
      _id: id,
      seniorId: user._id,
      status: 'active'
    });

    if (!consent) {
      throw new AppError('Active consent link not found', 404, 'NOT_FOUND');
    }

    if (shareLevel) consent.shareLevel = shareLevel;
    if (alertThreshold) consent.alertThreshold = alertThreshold;

    await consent.save();

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_UPDATED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      details: { shareLevel, alertThreshold }
    });

    res.json({
      message: 'Consent preferences updated',
      consent
    });
  } catch (err) {
    next(err);
  }
};

export const revokeConsent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const consent = await Consent.findOne({
      _id: id,
      seniorId: user._id
    });

    if (!consent) {
      throw new AppError('Consent link not found', 404, 'NOT_FOUND');
    }

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    await consent.save();

    await AuditLog.create({
      userId: user._id,
      action: 'CONSENT_REVOKED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      details: { familyId: consent.familyId }
    });

    res.json({
      message: 'Consent revoked. Family member will no longer receive alerts or view submissions.',
      consent
    });
  } catch (err) {
    next(err);
  }
};
