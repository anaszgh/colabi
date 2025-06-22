import { Router } from 'express';
import { linkedInController } from '../controllers/linkedin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * LinkedIn Webhook Routes
 * These are public endpoints that LinkedIn will call
 */

// Webhook validation endpoint (GET request from LinkedIn)
router.get('/webhook', linkedInController.handleWebhookChallenge.bind(linkedInController));

// Webhook events endpoint (POST request from LinkedIn)
router.post('/webhook', linkedInController.handleWebhook.bind(linkedInController));

/**
 * LinkedIn OAuth Routes
 * These handle the OAuth flow
 */

// OAuth callback endpoint (public)
router.get('/oauth/callback', linkedInController.handleOAuthCallback.bind(linkedInController));

/**
 * LinkedIn API Routes
 * These require authentication
 */

// Test LinkedIn connection for a specific account
router.get('/test/:accountId', authenticateToken, linkedInController.testConnection.bind(linkedInController));

// Manually sync messages for a LinkedIn account
router.post('/sync/:accountId', authenticateToken, linkedInController.syncMessages.bind(linkedInController));

export default router; 