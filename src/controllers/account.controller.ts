import { Request, Response } from 'express';
import { AccountService } from '../services/account.service';
import { Platform } from '../entities/account.entity';
import crypto from 'crypto';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /**
   * Get all accounts for the authenticated user
   */
  getAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const accounts = await this.accountService.getUserAccounts(req.user.id);

      res.json({
        success: true,
        data: {
          accounts,
          total: accounts.length
        }
      });

    } catch (error: any) {
      console.error('Get accounts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch accounts'
      });
    }
  };

  /**
   * Get account by ID
   */
  getAccountById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accountId } = req.params;
      const account = await this.accountService.getAccountById(accountId, req.user.id);

      if (!account) {
        res.status(404).json({
          success: false,
          error: 'Account not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { account }
      });

    } catch (error: any) {
      console.error('Get account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account'
      });
    }
  };

  /**
   * Delete account
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

      const { accountId } = req.params;
      await this.accountService.deleteAccount(accountId, req.user.id);

      res.json({
        success: true,
        message: 'Account disconnected successfully'
      });

    } catch (error: any) {
      console.error('Delete account error:', error);
      
      if (error.message === 'Account not found') {
        res.status(404).json({
          success: false,
          error: 'Account not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to disconnect account'
      });
    }
  };

  /**
   * Update account status
   */
  updateAccountStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accountId } = req.params;
      const { status } = req.body;

      const account = await this.accountService.updateAccountStatus(accountId, req.user.id, status);

      res.json({
        success: true,
        message: 'Account status updated successfully',
        data: { account }
      });

    } catch (error: any) {
      console.error('Update account status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update account status'
      });
    }
  };

  /**
   * Get account statistics
   */
  getAccountStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const stats = await this.accountService.getAccountStats(req.user.id);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error: any) {
      console.error('Get account stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account statistics'
      });
    }
  };

  /**
   * Start OAuth flow for a platform
   */
  startOAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { platform } = req.params;
      
      // Validate platform
      if (!Object.values(Platform).includes(platform as Platform)) {
        res.status(400).json({
          success: false,
          error: 'Invalid platform'
        });
        return;
      }

      // Generate state parameter for security
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session (you might want to use Redis in production)
      // For now, we'll include userId and platform in the state
      const stateData = {
        userId: req.user.id,
        platform,
        timestamp: Date.now()
      };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

      try {
        const authUrl = this.accountService.generateOAuthUrl(platform as Platform, encodedState);
        
        res.json({
          success: true,
          data: {
            authUrl,
            platform
          }
        });
      } catch (error: any) {
        if (error.message.includes('not configured')) {
          res.status(400).json({
            success: false,
            error: `${platform} integration is not configured. Please contact support.`
          });
          return;
        }
        throw error;
      }

    } catch (error: any) {
      console.error('Start OAuth error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start OAuth flow'
      });
    }
  };

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      // Check for OAuth errors
      if (error) {
        res.redirect(`/accounts?error=${encodeURIComponent(error as string)}`);
        return;
      }

      if (!code || !state) {
        res.redirect('/accounts?error=Missing authorization code or state');
        return;
      }

      // Decode and validate state
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch {
        res.redirect('/accounts?error=Invalid state parameter');
        return;
      }

      // Validate state data
      if (!stateData.userId || stateData.platform !== platform) {
        res.redirect('/accounts?error=Invalid state data');
        return;
      }

      // Check if state is not too old (15 minutes)
      if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
        res.redirect('/accounts?error=OAuth session expired');
        return;
      }

      // TODO: Exchange code for access token
      // This would involve calling the platform's token endpoint
      // For now, we'll create a mock account

      const mockAccountData = {
        userId: stateData.userId,
        platform: platform as Platform,
        platformId: `mock_${Date.now()}`,
        username: `mock_user_${platform}`,
        displayName: `Mock ${platform} Account`,
        accessToken: 'mock_access_token',
        // In real implementation, these would come from the OAuth response
      };

      // TODO: Replace this with actual OAuth token exchange
      console.log('OAuth callback received:', { platform, code, stateData });
      console.log('Would create account with:', mockAccountData);

      res.redirect('/accounts?success=Account connected successfully');

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.redirect('/accounts?error=Failed to connect account');
    }
  };

  /**
   * Sync account data from platform
   */
  syncAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accountId } = req.params;
      const account = await this.accountService.syncAccountData(accountId, req.user.id);

      res.json({
        success: true,
        message: 'Account synced successfully',
        data: { account }
      });

    } catch (error: any) {
      console.error('Sync account error:', error);
      
      if (error.message === 'Account not found') {
        res.status(404).json({
          success: false,
          error: 'Account not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to sync account'
      });
    }
  };

  /**
   * Get accounts that need token refresh
   */
  getAccountsNeedingRefresh = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const accounts = await this.accountService.getAccountsNeedingRefresh(req.user.id);

      res.json({
        success: true,
        data: {
          accounts,
          count: accounts.length
        }
      });

    } catch (error: any) {
      console.error('Get accounts needing refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check account refresh status'
      });
    }
  };
} 