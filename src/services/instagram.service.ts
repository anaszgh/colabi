import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account, Platform, AccountStatus } from '../entities/account.entity';
import { Message, MessageType, MessageStatus, MessagePriority } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import crypto from 'crypto';

/**
 * Instagram Service
 * 
 * This service handles Instagram OAuth integration using the Instagram Basic Display API.
 * 
 * IMPORTANT NOTES:
 * - Instagram Basic Display API provides access to user profile and media
 * - Instagram API Platform requires Business verification for messaging APIs
 * - Direct messaging requires Instagram Business Account and Graph API
 * - Comments and media interactions require specific permissions
 * 
 * Available features:
 * - OAuth authentication with Instagram
 * - Basic profile information (username, account type, media count)
 * - User media access (photos, videos)
 * 
 * Limited features (require business verification):
 * - Direct messaging
 * - Comments management
 * - Advanced profile data
 * - Insights and analytics
 */

export interface InstagramProfile {
  id: string;
  username: string;
  accountType: 'PERSONAL' | 'BUSINESS';
  mediaCount?: number;
  profilePictureUrl?: string;
  website?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
}

export interface InstagramMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnail?: string;
  caption?: string;
  permalink: string;
  timestamp: Date;
  username: string;
}

export interface InstagramComment {
  id: string;
  text: string;
  timestamp: Date;
  username: string;
  from: {
    id: string;
    username: string;
  };
  replies?: InstagramComment[];
}

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  state?: string;
}

export interface InstagramWebhookPayload {
  type: 'MEDIA' | 'COMMENT' | 'MENTION' | 'STORY_INSIGHTS';
  timestamp: number;
  data: any;
  signature?: string;
}

export class InstagramService {
  private accountRepository: Repository<Account>;
  private messageRepository: Repository<Message>;
  private userRepository: Repository<User>;
  private baseUrl = 'https://graph.instagram.com';
  private oauthConfig: InstagramOAuthConfig;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.messageRepository = AppDataSource.getRepository(Message);
    this.userRepository = AppDataSource.getRepository(User);

    this.oauthConfig = {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
      scope: [
        'user_profile',
        'user_media'
      ]
    };

    // Debug logging to check environment variables
    console.log('Instagram OAuth Config:', {
      clientId: this.oauthConfig.clientId ? '***SET***' : 'NOT SET',
      clientSecret: this.oauthConfig.clientSecret ? '***SET***' : 'NOT SET',
      redirectUri: this.oauthConfig.redirectUri || 'NOT SET'
    });
  }

  /**
   * Generate OAuth authorization URL for Instagram
   */
  generateAuthUrl(userId: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scope.join(','),
      response_type: 'code',
      state: `${state}:${userId}:${Date.now()}`
    });

    const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    
    // Debug logging
    console.log('Instagram generateAuthUrl called with userId:', userId);
    console.log('Generated Instagram auth URL:', authUrl);
    console.log('OAuth config used:', {
      clientId: this.oauthConfig.clientId,
      redirectUri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scope.join(',')
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<{
    accessToken: string;
    userId: string;
    expiresIn?: number;
  }> {
    try {
      // Validate state parameter
      const [stateToken, userId, timestamp] = state.split(':');
      const now = Date.now();
      const stateTimestamp = parseInt(timestamp);
      
      // Check if state is within 10 minutes (600,000 ms)
      if (now - stateTimestamp > 600000) {
        throw new Error('OAuth state expired');
      }

      const tokenUrl = 'https://api.instagram.com/oauth/access_token';
      const params = new URLSearchParams({
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.oauthConfig.redirectUri,
        code
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Instagram OAuth error response:', error);
        throw new Error(`Instagram OAuth error: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json() as any;
      console.log('Instagram token response:', tokenData);

      // Exchange short-lived token for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(tokenData.access_token);

      return {
        accessToken: longLivedToken.access_token,
        userId,
        expiresIn: longLivedToken.expires_in || 5184000 // 60 days default
      };
    } catch (error) {
      console.error('Instagram OAuth exchange error:', error);
      throw new Error('Failed to exchange Instagram authorization code for token');
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.oauthConfig.clientSecret,
      access_token: shortLivedToken
    });

    const response = await fetch(`${this.baseUrl}/access_token?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram long-lived token error:', error);
      throw new Error('Failed to exchange for long-lived token');
    }

    return response.json() as Promise<{ access_token: string; expires_in: number }>;
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<InstagramProfile> {
    try {
      const fields = 'id,username,account_type,media_count,profile_picture_url';
      const response = await fetch(
        `${this.baseUrl}/me?fields=${fields}&access_token=${accessToken}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Instagram profile fetch error:', error);
        throw new Error(`Failed to fetch Instagram profile: ${response.status}`);
      }

      const profileData = await response.json() as any;
      
      return {
        id: profileData.id,
        username: profileData.username,
        accountType: profileData.account_type || 'PERSONAL',
        mediaCount: profileData.media_count,
        profilePictureUrl: profileData.profile_picture_url
      };
    } catch (error) {
      console.error('Instagram getUserProfile error:', error);
      throw new Error('Failed to get Instagram user profile');
    }
  }

  /**
   * Get user media
   */
  async getUserMedia(accessToken: string, limit: number = 25): Promise<InstagramMedia[]> {
    try {
      const fields = 'id,media_type,media_url,thumbnail_url,caption,permalink,timestamp,username';
      const response = await fetch(
        `${this.baseUrl}/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Instagram media fetch error:', error);
        throw new Error(`Failed to fetch Instagram media: ${response.status}`);
      }

      const mediaData = await response.json() as any;
      
      return mediaData.data.map((item: any) => ({
        id: item.id,
        mediaType: item.media_type,
        mediaUrl: item.media_url,
        thumbnail: item.thumbnail_url,
        caption: item.caption,
        permalink: item.permalink,
        timestamp: new Date(item.timestamp),
        username: item.username
      }));
    } catch (error) {
      console.error('Instagram getUserMedia error:', error);
      throw new Error('Failed to get Instagram user media');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(accessToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const params = new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: accessToken
      });

      const response = await fetch(`${this.baseUrl}/refresh_access_token?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Instagram token refresh error:', error);
        throw new Error('Failed to refresh Instagram access token');
      }

      const tokenData = await response.json() as any;

      return {
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      console.error('Instagram refreshAccessToken error:', error);
      throw new Error('Failed to refresh Instagram access token');
    }
  }

  /**
   * Sync account data from Instagram
   */
  async syncAccountData(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId, platform: Platform.INSTAGRAM }
      });

      if (!account || !account.accessToken) {
        return { success: false, error: 'Account not found or no access token' };
      }

      // Get fresh profile data
      const profile = await this.getUserProfile(account.accessToken);
      
      // Update account with fresh data
      await this.accountRepository.update(accountId, {
        username: profile.username,
        displayName: profile.username,
        avatar: profile.profilePictureUrl,
        bio: profile.biography,
        followersCount: profile.followersCount,
        followingCount: profile.followsCount,
        lastSyncAt: new Date(),
        status: AccountStatus.CONNECTED,
                 metadata: {
           ...account.metadata,
           accountType: profile.accountType,
           mediaCount: profile.mediaCount,
           lastProfileSync: new Date()
         } as any
      });

      return { success: true };
    } catch (error) {
      console.error('Instagram sync error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process Instagram webhook (for future implementation)
   */
  async processWebhook(payload: InstagramWebhookPayload, signature: string): Promise<boolean> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        console.error('Instagram webhook signature verification failed');
        return false;
      }

      // Process different webhook types
      switch (payload.type) {
        case 'MEDIA':
          await this.processMediaWebhook(payload.data);
          break;
        case 'COMMENT':
          await this.processCommentWebhook(payload.data);
          break;
        case 'MENTION':
          await this.processMentionWebhook(payload.data);
          break;
        default:
          console.log('Unhandled Instagram webhook type:', payload.type);
      }

      return true;
    } catch (error) {
      console.error('Instagram webhook processing error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.oauthConfig.clientSecret)
        .update(payload)
        .digest('hex');

      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      console.error('Instagram webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process media webhook
   */
  private async processMediaWebhook(data: any): Promise<void> {
    try {
      // TODO: Implement media webhook processing
      console.log('Processing Instagram media webhook:', data);
    } catch (error) {
      console.error('Instagram media webhook processing error:', error);
    }
  }

  /**
   * Process comment webhook
   */
  private async processCommentWebhook(data: any): Promise<void> {
    try {
      // TODO: Implement comment webhook processing
      console.log('Processing Instagram comment webhook:', data);
    } catch (error) {
      console.error('Instagram comment webhook processing error:', error);
    }
  }

  /**
   * Process mention webhook
   */
  private async processMentionWebhook(data: any): Promise<void> {
    try {
      // TODO: Implement mention webhook processing
      console.log('Processing Instagram mention webhook:', data);
    } catch (error) {
      console.error('Instagram mention webhook processing error:', error);
    }
  }

  /**
   * Validate webhook challenge (for webhook setup)
   */
  validateWebhookChallenge(challengeCode: string): string {
    // Instagram webhook challenge validation
    return challengeCode;
  }
} 