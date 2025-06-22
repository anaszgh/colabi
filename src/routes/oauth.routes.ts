import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';

const router = Router();
const accountController = new AccountController();

// OAuth callback routes (no auth required as these are callbacks from external services)
router.get('/instagram/callback', accountController.handleOAuthCallback);
router.get('/tiktok/callback', accountController.handleOAuthCallback);
router.get('/youtube/callback', accountController.handleOAuthCallback);
router.get('/twitter/callback', accountController.handleOAuthCallback);
router.get('/facebook/callback', accountController.handleOAuthCallback);
router.get('/linkedin/callback', accountController.handleOAuthCallback);

export default router; 