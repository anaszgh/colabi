import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import {
  authenticateToken,
  requireRole,
  validateRequest
} from '../middleware/auth.middleware';
import { UserRole } from '../entities/user.entity';
import Joi from 'joi';

const router = Router();
const userController = new UserController();

// Validation schemas for user operations
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  bio: Joi.string().max(500).trim().optional().allow(''),
  company: Joi.string().max(200).trim().optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  avatar: Joi.string().uri().optional().allow(''),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    autoReply: Joi.boolean().optional(),
    timezone: Joi.string().optional()
  }).optional()
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required()
});

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticateToken,
  validateRequest(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateToken,
  validateRequest(changePasswordSchema),
  userController.changePassword
);

/**
 * @route   GET /api/users/dashboard/metrics
 * @desc    Get dashboard metrics for current user
 * @access  Private
 */
router.get('/dashboard/metrics', authenticateToken, userController.getDashboardMetrics);

/**
 * @route   GET /api/users/dashboard/activity
 * @desc    Get recent activity for current user
 * @access  Private
 */
router.get('/dashboard/activity', authenticateToken, userController.getRecentActivity);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (Legacy endpoint)
 * @access  Private
 */
router.get('/stats', authenticateToken, userController.getUserStats);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
  '/account',
  authenticateToken,
  validateRequest(deleteAccountSchema),
  userController.deleteAccount
);

// Admin-only routes
/**
 * @route   GET /api/users
 * @desc    List all users (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  userController.listUsers
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/:userId',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  userController.getUserById
);

export default router;