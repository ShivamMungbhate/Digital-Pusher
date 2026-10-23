import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { Alert } from '../models/Alert.js';
import { AppError } from '../middlewares/errorHandler.js';

const router = Router();

router.use(authenticate);

// GET /api/alerts - List alerts for logged in user (family member or senior)
router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const query =
    req.user.role === 'family'
      ? { familyId: req.user._id }
      : { seniorId: req.user._id };

  const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(50);
  res.json({ alerts });
});

// PATCH /api/alerts/:id/handled - Mark an alert as handled
router.patch('/:id/handled', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const alert = await Alert.findById(req.params.id);
  if (!alert) {
    throw new AppError('Alert not found', 404, 'NOT_FOUND');
  }

  // Ensure only the assigned family member or the senior can update
  if (
    alert.familyId.toString() !== req.user._id.toString() &&
    alert.seniorId.toString() !== req.user._id.toString()
  ) {
    throw new AppError('Forbidden: Not authorized to update this alert', 403, 'FORBIDDEN');
  }

  alert.status = 'handled';
  alert.handledAt = new Date();
  if (req.body.note) {
    alert.handledNote = req.body.note;
  }
  await alert.save();

  res.json({ message: 'Alert marked as handled', alert });
});

export default router;
