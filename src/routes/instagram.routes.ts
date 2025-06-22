import { Router } from 'express';
import { InstagramController } from '../controllers/instagram.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const instagramController = new InstagramController();

// Protected routes (require authentication)
router.post('/profile', authenticateToken, instagramController.getProfile);
router.post('/media', authenticateToken, instagramController.getMedia);
router.post('/refresh-token', authenticateToken, instagramController.refreshToken);
router.post('/sync/:accountId', authenticateToken, instagramController.syncAccount);
router.post('/test-connection', authenticateToken, instagramController.testConnection);

// Webhook routes (no auth required as these are callbacks from Instagram)
router.post('/webhook', instagramController.handleWebhook);
router.get('/webhook', instagramController.handleWebhookChallenge);

export default router; 