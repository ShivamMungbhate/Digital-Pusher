import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { Submission, SubmissionMode } from '../models/Submission.js';
import { Analysis } from '../models/Analysis.js';
import { Consent } from '../models/Consent.js';
import { maskPII } from '../utils/maskPII.js';
import { storage } from '../utils/storage.js';
import { submissionQueue } from '../services/queue.js';
import { AuditLog } from '../models/AuditLog.js';

// Max file size limits in bytes
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
const OVERALL_MAX_SIZE = 100 * 1024 * 1024; // 100MB

// Multer memory storage
const memoryStorage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const mime = file.mimetype.toLowerCase();

  const isAudio = mime.startsWith('audio/');
  const isVideo = mime.startsWith('video/');
  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf';

  if (!isAudio && !isVideo && !isImage && !isPdf) {
    return cb(
      new AppError(
        `Unsupported file type '${file.mimetype}'. Supported formats: audio, video, image, and PDF.`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: OVERALL_MAX_SIZE },
  fileFilter
});

export function validateFileSize(file: Express.Multer.File): void {
  const mime = file.mimetype.toLowerCase();
  const size = file.size;

  if (mime.startsWith('audio/') && size > MAX_AUDIO_SIZE) {
    throw new AppError('Audio file exceeds the maximum allowed limit of 25MB', 400, 'FILE_TOO_LARGE');
  }
  if (mime.startsWith('video/') && size > MAX_VIDEO_SIZE) {
    throw new AppError('Video file exceeds the maximum allowed limit of 100MB', 400, 'FILE_TOO_LARGE');
  }
  if (mime.startsWith('image/') && size > MAX_IMAGE_SIZE) {
    throw new AppError('Image file exceeds the maximum allowed limit of 20MB', 400, 'FILE_TOO_LARGE');
  }
  if (mime === 'application/pdf' && size > MAX_PDF_SIZE) {
    throw new AppError('PDF document exceeds the maximum allowed limit of 20MB', 400, 'FILE_TOO_LARGE');
  }
}

export const createSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;
    const { text, mode = 'auto', language = 'en' } = req.body;

    if (!file && (!text || text.trim().length === 0)) {
      throw new AppError('Either a text message or a file upload is required', 400, 'MISSING_CONTENT');
    }

    if (file) {
      validateFileSize(file);
    }

    // Mask PII from user text
    let maskedText = '';
    if (text) {
      const piiResult = maskPII(text);
      maskedText = piiResult.maskedText;
    }

    // Detect media source type
    let sourceType: 'text' | 'audio' | 'video' | 'image' | 'pdf' = 'text';
    let storageKey: string | undefined = undefined;

    if (file) {
      const mime = file.mimetype.toLowerCase();
      if (mime.startsWith('audio/')) sourceType = 'audio';
      else if (mime.startsWith('video/')) sourceType = 'video';
      else if (mime.startsWith('image/')) sourceType = 'image';
      else if (mime === 'application/pdf') sourceType = 'pdf';

      // Encrypt and store media at rest with AES-256-GCM
      const saved = await storage.save(file.buffer, file.originalname);
      storageKey = saved.storageKey;
    }

    // Create Submission document
    const submission = await Submission.create({
      userId: user._id,
      mode: (mode as SubmissionMode) || 'auto',
      language: language || user.preferredLanguage || 'en',
      sourceType,
      originalFileName: file?.originalname,
      mimeType: file?.mimetype,
      fileSizeBytes: file?.size,
      storageKey,
      isEncrypted: !!storageKey,
      rawTextMasked: maskedText || undefined,
      status: 'queued',
      retryCount: 0
    });

    // Enqueue analysis job
    await submissionQueue.enqueue(submission._id.toString());

    await AuditLog.create({
      userId: user._id,
      action: 'SUBMISSION_CREATED',
      resourceType: 'Submission',
      resourceId: submission._id.toString(),
      details: { mode: submission.mode, sourceType: submission.sourceType }
    });

    res.status(201).json({
      message: 'Submission received and queued for analysis',
      submissionId: submission._id,
      status: submission.status,
      createdAt: submission.createdAt
    });
  } catch (err) {
    next(err);
  }
};

export const getSubmissionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const submission = await Submission.findById(id);
    if (!submission) {
      throw new AppError('Submission not found', 404, 'NOT_FOUND');
    }

    // Authorization: Owner or actively consented family member
    const isOwner = submission.userId.toString() === user._id.toString();
    let hasConsent = false;

    if (!isOwner && user.role === 'family') {
      const activeConsent = await Consent.findOne({
        seniorId: submission.userId,
        familyId: user._id,
        status: 'active'
      });
      if (activeConsent) {
        hasConsent = true;
      }
    }

    if (!isOwner && !hasConsent) {
      throw new AppError('You do not have permission to view this submission', 403, 'FORBIDDEN');
    }

    // Retrieve analysis result if done
    const analysis = await Analysis.findOne({ submissionId: submission._id });

    res.json({
      submission: {
        id: submission._id,
        userId: submission.userId,
        mode: submission.mode,
        language: submission.language,
        sourceType: submission.sourceType,
        originalFileName: submission.originalFileName,
        rawTextMasked: submission.rawTextMasked,
        status: submission.status,
        error: submission.error,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      },
      analysis: analysis || null
    });
  } catch (err) {
    next(err);
  }
};

export const listSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { mode, status } = req.query;

    const query: any = { userId: user._id };
    if (mode && mode !== 'all') {
      query.mode = mode;
    }
    if (status) {
      query.status = status;
    }

    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    // Fetch matching analysis records
    const submissionIds = submissions.map((s) => s._id);
    const analyses = await Analysis.find({ submissionId: { $in: submissionIds } });
    const analysisMap = new Map(analyses.map((a) => [a.submissionId.toString(), a]));

    const results = submissions.map((s) => ({
      id: s._id,
      mode: s.mode,
      sourceType: s.sourceType,
      originalFileName: s.originalFileName,
      status: s.status,
      createdAt: s.createdAt,
      analysis: analysisMap.get(s._id.toString()) || null
    }));

    res.json({ submissions: results });
  } catch (err) {
    next(err);
  }
};
