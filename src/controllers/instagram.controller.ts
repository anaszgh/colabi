import { Request, Response } from 'express';
import { InstagramService } from '../services/instagram.service';

export class InstagramController {
  private instagramService: InstagramService;

  constructor() {
    this.instagramService = new InstagramService();
  }

  /**
   * Get Instagram profile information
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

      const { accessToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      const profile = await this.instagramService.getUserProfile(accessToken);

      res.json({
        success: true,
        data: { profile }
      });

    } catch (error: any) {
      console.error('Instagram get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Instagram profile'
      });
    }
  };

  /**
   * Get Instagram media
   */
  getMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accessToken } = req.body;
      const { limit = 25 } = req.query;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      const media = await this.instagramService.getUserMedia(accessToken, parseInt(limit as string));

      res.json({
        success: true,
        data: { 
          media,
          count: media.length
        }
      });

    } catch (error: any) {
      console.error('Instagram get media error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Instagram media'
      });
    }
  };

  /**
   * Refresh Instagram access token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accessToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      const tokenData = await this.instagramService.refreshAccessToken(accessToken);

      res.json({
        success: true,
        data: { 
          accessToken: tokenData.accessToken,
          expiresIn: tokenData.expiresIn
        }
      });

    } catch (error: any) {
      console.error('Instagram refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh Instagram access token'
      });
    }
  };

  /**
   * Sync Instagram account data
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

      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'Account ID is required'
        });
        return;
      }

      const result = await this.instagramService.syncAccountData(accountId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to sync Instagram account'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Instagram account synced successfully'
      });

    } catch (error: any) {
      console.error('Instagram sync account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync Instagram account'
      });
    }
  };

  /**
   * Handle Instagram webhook
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.get('X-Hub-Signature-256') || '';
      const payload = req.body;

      // Verify webhook and process
      const processed = await this.instagramService.processWebhook(payload, signature);

      if (!processed) {
        res.status(400).json({
          success: false,
          error: 'Failed to process Instagram webhook'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Instagram webhook processed successfully'
      });

    } catch (error: any) {
      console.error('Instagram webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Instagram webhook'
      });
    }
  };

  /**
   * Handle webhook challenge (for webhook setup)
   */
  handleWebhookChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

      // Verify the webhook challenge
      if (token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
        const challengeResponse = this.instagramService.validateWebhookChallenge(challenge as string);
        res.send(challengeResponse);
      } else {
        res.status(403).send('Invalid verify token');
      }

    } catch (error: any) {
      console.error('Instagram webhook challenge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to handle Instagram webhook challenge'
      });
    }
  };

  /**
   * Test Instagram API connectivity
   */
  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { accessToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      // Test by fetching basic profile
      const profile = await this.instagramService.getUserProfile(accessToken);

      res.json({
        success: true,
        message: 'Instagram API connection successful',
        data: {
          connected: true,
          username: profile.username,
          accountType: profile.accountType,
          mediaCount: profile.mediaCount
        }
      });

    } catch (error: any) {
      console.error('Instagram test connection error:', error);
      res.status(500).json({
        success: false,
        error: 'Instagram API connection failed'
      });
    }
  };
} 