import { Router } from 'express';
import {
  createSubmission,
  getSubmissionById,
  listSubmissions,
  uploadMiddleware
} from '../controllers/submissionController.js';
import { authenticate } from '../middlewares/auth.js';
import { submissionLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(authenticate);

// Submit text or file for AI analysis
router.post(
  '/',
  submissionLimiter,
  uploadMiddleware.single('file'),
  createSubmission
);

// Get submission details and analysis verdict
router.get('/:id', getSubmissionById);

// List user's past submissions
router.get('/', listSubmissions);

export default router;
