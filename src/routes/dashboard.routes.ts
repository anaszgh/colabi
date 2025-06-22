import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

/**
 * @route   GET /dashboard
 * @desc    Render dashboard page
 * @access  Public (client-side auth check)
 */
router.get('/', dashboardController.renderDashboard);

/**
 * @route   GET /dashboard/messages
 * @desc    Render messages page
 * @access  Public (client-side auth check)
 */
router.get('/messages', dashboardController.renderMessages);

/**
 * @route   GET /dashboard/accounts
 * @desc    Render accounts page
 * @access  Public (client-side auth check)
 */
router.get('/accounts', dashboardController.renderAccounts);

/**
 * @route   GET /dashboard/analytics
 * @desc    Render analytics page
 * @access  Public (client-side auth check)
 */
router.get('/analytics', dashboardController.renderAnalytics);

/**
 * @route   GET /dashboard/settings
 * @desc    Render settings page
 * @access  Public (client-side auth check)
 */
router.get('/settings', dashboardController.renderSettings);

export default router;