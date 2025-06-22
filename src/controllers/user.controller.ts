import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UserRole } from '../entities/user.entity';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get User Profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const user = await this.userService.findById(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: {
          user: userResponse
        }
      });

    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  };

  /**
   * Update User Profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const allowedFields = [
        'name', 'bio', 'company', 'website', 'avatar', 'preferences'
      ];

      // Filter only allowed fields
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
        return;
      }

      const updatedUser = await this.userService.updateUser(req.user.id, updateData);

      // Remove password from response
      const { password: _, ...userResponse } = updatedUser;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: userResponse
        }
      });

    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  };

  /**
   * Change Password
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      // Get user with password
      const user = await this.userService.findById(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Verify current password
      const isValidPassword = await this.userService.validatePassword(user, currentPassword);

      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
        return;
      }

      // Update password
      await this.userService.updatePassword(user.id, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  };

  /**
   * Get Dashboard Metrics
   */
  getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const metrics = await this.userService.getDashboardMetrics(req.user.id);

      res.json({
        success: true,
        data: {
          metrics
        }
      });

    } catch (error: any) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard metrics'
      });
    }
  };

  /**
   * Get Recent Activity
   */
  getRecentActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await this.userService.getRecentActivity(req.user.id, limit);

      res.json({
        success: true,
        data: {
          activity
        }
      });

    } catch (error: any) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent activity'
      });
    }
  };

  /**
   * Get User Statistics (Legacy - for backwards compatibility)
   */
  getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const stats = await this.userService.getUserStats(req.user.id);

      res.json({
        success: true,
        data: {
          stats
        }
      });

    } catch (error: any) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user statistics'
      });
    }
  };

  /**
   * Delete User Account
   */
  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password confirmation is required'
        });
        return;
      }

      // Get user with password
      const user = await this.userService.findById(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Verify password
      const isValidPassword = await this.userService.validatePassword(user, password);

      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: 'Password is incorrect'
        });
        return;
      }

      // Delete user
      await this.userService.deleteUser(user.id);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error: any) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    }
  };

  /**
   * List Users (Admin only)
   */
  listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as UserRole;
      const status = req.query.status as string;

      const result = await this.userService.listUsers({
        page,
        limit,
        role,
        status: status as any
      });

      res.json({
        success: true,
        data: result,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages
        }
      });

    } catch (error: any) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list users'
      });
    }
  };

  /**
   * Get User by ID (Admin only)
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const { userId } = req.params;

      const user = await this.userService.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        data: {
          user: userResponse
        }
      });

    } catch (error: any) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  };
}