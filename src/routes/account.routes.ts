import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const accountController = new AccountController();

// Protect all account routes with authentication
router.use(authenticateToken);

// Account management routes
router.get('/', accountController.getAccounts);
router.get('/stats', accountController.getAccountStats);
router.get('/refresh-needed', accountController.getAccountsNeedingRefresh);
router.get('/:accountId', accountController.getAccountById);
router.delete('/:accountId', accountController.deleteAccount);
router.patch('/:accountId/status', accountController.updateAccountStatus);
router.post('/:accountId/sync', accountController.syncAccount);

// OAuth routes
router.post('/connect/:platform', accountController.startOAuth);

export default router; 