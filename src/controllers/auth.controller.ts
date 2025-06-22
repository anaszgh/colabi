import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthUtils } from '../utils/auth';
import { UserRole } from '../entities/user.entity';

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * User Registration
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        email,
        password,
        name,
        role = UserRole.INFLUENCER,
        company,
        website,
        bio
      } = req.body;

      // Create user
      const user = await this.userService.createUser({
        email,
        password,
        name,
        role,
        company
      });

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(user);
      const refreshToken = AuthUtils.generateRefreshToken(user);

      // Generate email verification token
      const emailVerificationToken = AuthUtils.generateEmailVerificationToken();
      await this.userService.setEmailVerificationToken(user.id, emailVerificationToken);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userResponse,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '7d'
          }
        }
      });

      // TODO: Send email verification email (implement email service)
      console.log(`Email verification token for ${email}: ${emailVerificationToken}`);

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'An account with this email already exists'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again later.'
      });
    }
  };

  /**
   * User Login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Find user by email
      const user = await this.userService.findByEmail(email);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Account is inactive. Please contact support.'
        });
        return;
      }

      // Validate password
      const isValidPassword = await this.userService.validatePassword(user, password);

      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      // Update last login
      await this.userService.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(user);
      const refreshToken = AuthUtils.generateRefreshToken(user);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: rememberMe ? '30d' : '7d'
          }
        }
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again later.'
      });
    }
  };

  /**
   * Logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a production app, you might want to blacklist the token
      // For now, we'll just return success (client should delete the token)
      
      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  };

  /**
   * Refresh Token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: 'Refresh token required'
        });
        return;
      }

      // Verify refresh token
      const decoded = AuthUtils.verifyToken(refreshToken);

      // Get user
      const user = await this.userService.findById(decoded.userId);

      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
        return;
      }

      // Generate new tokens
      const newAccessToken = AuthUtils.generateAccessToken(user);
      const newRefreshToken = AuthUtils.generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: '7d'
          }
        }
      });

    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  };

  /**
   * Get Current User
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      // Get full user data
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
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user data'
      });
    }
  };

  /**
   * Forgot Password
   */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      const user = await this.userService.findByEmail(email);

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
        return;
      }

      // Generate reset token
      const resetToken = AuthUtils.generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.userService.setPasswordResetToken(user.id, resetToken, resetExpires);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

      // TODO: Send password reset email
      console.log(`Password reset token for ${email}: ${resetToken}`);

    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request'
      });
    }
  };

  /**
   * Reset Password
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      // Verify token format
      if (!AuthUtils.verifySpecialToken(token, 'password_reset')) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
        return;
      }

      // Find user by reset token
      const user = await this.userService.findByPasswordResetToken(token);

      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
        return;
      }

      // Update password
      await this.userService.updatePassword(user.id, newPassword);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });

    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  };

  /**
   * Verify Email
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      // Verify token format
      if (!AuthUtils.verifySpecialToken(token, 'email_verification')) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token'
        });
        return;
      }

      // Find user by verification token
      const user = await this.userService.findByEmailVerificationToken(token);

      if (!user) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token'
        });
        return;
      }

      // Verify email
      await this.userService.verifyEmail(user.id);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify email'
      });
    }
  };
}