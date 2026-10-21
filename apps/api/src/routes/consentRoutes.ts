import { Router } from 'express';
import {
  generateInviteCode,
  linkWithCode,
  getConsents,
  acceptConsent,
  rejectConsent,
  updateConsent,
  revokeConsent,
  createInviteSchema,
  linkInviteSchema,
  updateConsentSchema
} from '../controllers/consentController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';

const router = Router();

router.use(authenticate);

// List consents for current user
router.get('/', getConsents);

// Senior generates invite code
router.post(
  '/invite-code',
  requireRole(['senior']),
  validateRequest(createInviteSchema),
  generateInviteCode
);

// Family submits invite code to link
router.post(
  '/link',
  requireRole(['family']),
  validateRequest(linkInviteSchema),
  linkWithCode
);

// Senior actions
router.post('/:id/accept', requireRole(['senior']), acceptConsent);
router.post('/:id/reject', requireRole(['senior']), rejectConsent);
router.patch(
  '/:id',
  requireRole(['senior']),
  validateRequest(updateConsentSchema),
  updateConsent
);
router.post('/:id/revoke', requireRole(['senior']), revokeConsent);

export default router;
