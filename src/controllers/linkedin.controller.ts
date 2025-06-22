import { Request, Response } from 'express';
import { LinkedInService } from '../services/linkedin.service';
import { AccountService } from '../services/account.service';

export class LinkedInController {
  private linkedInService: LinkedInService;
  private accountService: AccountService;

  constructor() {
    this.linkedInService = new LinkedInService();
    this.accountService = new AccountService();
  }

  /**
   * Handle LinkedIn webhook validation challenge
   */
  async handleWebhookChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { challengeCode, applicationId } = req.query;

      if (!challengeCode || typeof challengeCode !== 'string') {
        res.status(400).json({ error: 'Missing or invalid challengeCode' });
        return;
      }

      const challengeResponse = this.linkedInService.validateWebhookChallenge(challengeCode);

      res.status(200).json({
        challengeCode,
        challengeResponse,
        ...(applicationId && { applicationId })
      });
    } catch (error) {
      console.error('Error handling LinkedIn webhook challenge:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle LinkedIn webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-li-signature'] as string;
      const payload = req.body;

      if (!signature) {
        console.error('Missing LinkedIn webhook signature');
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const success = await this.linkedInService.processWebhook(payload, signature);

      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(400).json({ error: 'Failed to process webhook' });
      }
    } catch (error) {
      console.error('Error processing LinkedIn webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   */
  async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error, error_description } = req.query;
      
      // Handle OAuth error
      if (error) {
        console.error('LinkedIn OAuth error:', error, error_description);
        const errorMessage = encodeURIComponent(`LinkedIn connection failed: ${error_description || error}`);
        res.redirect(`/accounts?error=${errorMessage}`);
        return;
      }

      // Validate required parameters
      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        const errorMessage = encodeURIComponent('Invalid OAuth callback parameters');
        res.redirect(`/accounts?error=${errorMessage}`);
        return;
      }

      // Handle LinkedIn OAuth and create account
      const account = await this.accountService.handleLinkedInOAuth(code, state);

      const successMessage = encodeURIComponent(`LinkedIn account ${account.displayName} connected successfully!`);
      res.redirect(`/accounts?success=${successMessage}`);

    } catch (error) {
      console.error('Error handling LinkedIn OAuth callback:', error);
      const errorMessage = encodeURIComponent(`Failed to connect LinkedIn account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.redirect(`/accounts?error=${errorMessage}`);
    }
  }

  /**
   * Test LinkedIn API connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        res.status(400).json({ error: 'Account ID is required' });
        return;
      }

      const result = await this.linkedInService.syncMessages(accountId);

      res.json({
        success: result.success,
        newMessages: result.newMessages,
        error: result.error
      });
    } catch (error) {
      console.error('Error testing LinkedIn connection:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Manually trigger message sync for a LinkedIn account
   */
  async syncMessages(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        res.status(400).json({ error: 'Account ID is required' });
        return;
      }

      console.log(`Triggering LinkedIn message sync for account: ${accountId}`);
      const result = await this.linkedInService.syncMessages(accountId);

      res.json({
        success: result.success,
        newMessages: result.newMessages,
        message: result.success 
          ? `Successfully synced ${result.newMessages} new messages`
          : `Sync failed: ${result.error}`,
        error: result.error
      });
    } catch (error) {
      console.error('Error syncing LinkedIn messages:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

// Export controller instance
export const linkedInController = new LinkedInController(); 