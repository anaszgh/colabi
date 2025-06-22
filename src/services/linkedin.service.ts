import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account, Platform, AccountStatus } from '../entities/account.entity';
import { Message, MessageType, MessageStatus, MessagePriority } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import crypto from 'crypto';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  location?: string;
  industry?: string;
  profilePictureUrl?: string;
  publicProfileUrl?: string;
  emailAddress?: string;
}

export interface LinkedInMessage {
  id: string;
  conversationId: string;
  from: {
    id: string;
    name: string;
    profileUrl?: string;
  };
  to: {
    id: string;
    name: string;
  };
  content: string;
  sentAt: Date;
  messageType: 'MEMBER_TO_MEMBER' | 'INMAIL' | 'SPONSORED_INMAIL';
  attachments?: Array<{
    type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'LINK';
    url: string;
    fileName?: string;
  }>;
}

export interface LinkedInConversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    profileUrl?: string;
  }>;
  lastMessage?: LinkedInMessage;
  unreadCount: number;
  updatedAt: Date;
}

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  state?: string;
}

export interface LinkedInWebhookPayload {
  type: 'MESSAGE' | 'CONNECTION_REQUEST' | 'POST_COMMENT' | 'PROFILE_UPDATE';
  timestamp: number;
  data: any;
  signature?: string;
}

export class LinkedInService {
  private accountRepository: Repository<Account>;
  private messageRepository: Repository<Message>;
  private userRepository: Repository<User>;
  private baseUrl = 'https://api.linkedin.com/v2';
  private oauthConfig: LinkedInOAuthConfig;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.messageRepository = AppDataSource.getRepository(Message);
    this.userRepository = AppDataSource.getRepository(User);

    this.oauthConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
      scope: [
        'r_liteprofile',
        'rw_conversions',
        'r_ads'
      ]
    };

    // Debug logging to check environment variables
    console.log('LinkedIn OAuth Config:', {
      clientId: this.oauthConfig.clientId ? '***SET***' : 'NOT SET',
      clientSecret: this.oauthConfig.clientSecret ? '***SET***' : 'NOT SET',
      redirectUri: this.oauthConfig.redirectUri || 'NOT SET'
    });
  }

  /**
   * Generate OAuth authorization URL for LinkedIn
   */
  generateAuthUrl(userId: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scope.join(' '),
      state: `${state}:${userId}:${Date.now()}`
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    // Debug logging
    console.log('LinkedIn generateAuthUrl called with userId:', userId);
    console.log('Generated LinkedIn auth URL:', authUrl);
    console.log('OAuth config used:', {
      clientId: this.oauthConfig.clientId,
      redirectUri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scope.join(' ')
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    userId: string;
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

      const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.oauthConfig.redirectUri,
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret
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
        throw new Error(`LinkedIn OAuth error: ${error}`);
      }

      const tokenData = await response.json() as any;

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in || 5184000, // 60 days default
        userId
      };
    } catch (error) {
      console.error('Error exchanging LinkedIn code for token:', error);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Get user profile information from LinkedIn
   */
  async getUserProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      // Get basic profile
      const profileResponse = await fetch(`${this.baseUrl}/people/~:(id,firstName,lastName,headline,location,industry,profilePicture(displayImage~:playableStreams))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        throw new Error(`LinkedIn API error: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json() as any;

      // Get email separately (requires additional permission)
      let emailAddress;
      try {
        const emailResponse = await fetch(`${this.baseUrl}/emailAddress?q=members&projection=(elements*(handle~))`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json() as any;
          emailAddress = emailData.elements?.[0]?.['handle~']?.emailAddress;
        }
      } catch (error) {
        console.warn('Could not fetch LinkedIn email address:', error);
      }

      return {
        id: profileData.id,
        firstName: profileData.firstName?.localized?.en_US || profileData.firstName?.preferredLocale?.language || '',
        lastName: profileData.lastName?.localized?.en_US || profileData.lastName?.preferredLocale?.language || '',
        headline: profileData.headline?.localized?.en_US,
        location: profileData.location?.name,
        industry: profileData.industry,
        profilePictureUrl: profileData.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier,
        publicProfileUrl: `https://linkedin.com/in/${profileData.id}`,
        emailAddress
      };
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  /**
   * Fetch conversations for a LinkedIn account
   */
  async getConversations(accessToken: string, limit: number = 20): Promise<LinkedInConversation[]> {
    try {
      // Note: This endpoint requires LinkedIn Partnership for full access
      // For now, we'll implement the structure for when access is available
      const response = await fetch(`${this.baseUrl}/conversations?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('LinkedIn conversations endpoint requires partnership access');
          return [];
        }
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return data.elements?.map((conv: any) => ({
        id: conv.id,
        participants: conv.participants?.map((p: any) => ({
          id: p.id,
          name: `${p.firstName?.localized?.en_US || ''} ${p.lastName?.localized?.en_US || ''}`.trim(),
          profileUrl: p.publicProfileUrl
        })) || [],
        lastMessage: conv.lastMessage ? this.mapLinkedInMessage(conv.lastMessage) : undefined,
        unreadCount: conv.unreadCount || 0,
        updatedAt: new Date(conv.lastActivityAt)
      })) || [];
    } catch (error) {
      console.error('Error fetching LinkedIn conversations:', error);
      return [];
    }
  }

  /**
   * Fetch messages from a specific conversation
   */
  async getMessages(accessToken: string, conversationId: string, limit: number = 50): Promise<LinkedInMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('LinkedIn messages endpoint requires partnership access');
          return [];
        }
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return data.elements?.map((msg: any) => this.mapLinkedInMessage(msg)) || [];
    } catch (error) {
      console.error('Error fetching LinkedIn messages:', error);
      return [];
    }
  }

  /**
   * Send a message via LinkedIn
   */
  async sendMessage(accessToken: string, recipientId: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          recipients: [recipientId],
          message: {
            body: content
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending LinkedIn message:', error);
      return false;
    }
  }

  /**
   * Sync messages for a LinkedIn account
   */
  async syncMessages(accountId: string): Promise<{ success: boolean; newMessages: number; error?: string }> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId, platform: Platform.LINKEDIN },
        relations: ['user']
      });

      if (!account || !account.accessToken) {
        return { success: false, newMessages: 0, error: 'Account not found or missing access token' };
      }

      // Check if token is still valid
      const profile = await this.getUserProfile(account.accessToken);
      if (!profile) {
        return { success: false, newMessages: 0, error: 'Invalid access token' };
      }

      // Get conversations
      const conversations = await this.getConversations(account.accessToken);
      let newMessageCount = 0;

      // Process each conversation
      for (const conversation of conversations) {
        const messages = await this.getMessages(account.accessToken, conversation.id);
        
        for (const linkedInMessage of messages) {
          // Check if message already exists
          const existingMessage = await this.messageRepository.findOne({
            where: { 
              platformMessageId: linkedInMessage.id,
              accountId: account.id 
            }
          });

          if (!existingMessage) {
            // Create new message
            const message = this.messageRepository.create({
              accountId: account.id,
              platformMessageId: linkedInMessage.id,
              type: MessageType.DM,
              content: linkedInMessage.content,
              senderUsername: linkedInMessage.from.id,
              senderDisplayName: linkedInMessage.from.name,
              receivedAt: linkedInMessage.sentAt,
              status: MessageStatus.UNREAD,
              priority: MessagePriority.MEDIUM,
              metadata: {
                threadId: linkedInMessage.conversationId,
                parentMessageId: linkedInMessage.messageType === 'INMAIL' ? linkedInMessage.id : undefined
              }
            });

            await this.messageRepository.save(message);
            newMessageCount++;
          }
        }
      }

      // Update account sync timestamp
      account.lastSyncAt = new Date();
      await this.accountRepository.save(account);

      return { success: true, newMessages: newMessageCount };
    } catch (error) {
      console.error('Error syncing LinkedIn messages:', error);
      return { 
        success: false, 
        newMessages: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Process LinkedIn webhook payload
   */
  async processWebhook(payload: LinkedInWebhookPayload, signature: string): Promise<boolean> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        console.error('Invalid LinkedIn webhook signature');
        return false;
      }

      switch (payload.type) {
        case 'MESSAGE':
          await this.processMessageWebhook(payload.data);
          break;
        case 'CONNECTION_REQUEST':
          await this.processConnectionRequestWebhook(payload.data);
          break;
        default:
          console.log(`Unhandled LinkedIn webhook type: ${payload.type}`);
      }

      return true;
    } catch (error) {
      console.error('Error processing LinkedIn webhook:', error);
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
        .update(`hmacsha256=${payload}`)
        .digest('hex');
      
      return signature === `hmacsha256=${expectedSignature}`;
    } catch (error) {
      console.error('Error verifying LinkedIn webhook signature:', error);
      return false;
    }
  }

  /**
   * Process message webhook
   */
  private async processMessageWebhook(data: any): Promise<void> {
    try {
      // Find the account this message belongs to
      const account = await this.accountRepository.findOne({
        where: { 
          platform: Platform.LINKEDIN,
          platformId: data.recipientId || data.accountId
        }
      });

      if (!account) {
        console.warn('Account not found for LinkedIn message webhook');
        return;
      }

      // Check if message already exists
      const existingMessage = await this.messageRepository.findOne({
        where: { 
          platformMessageId: data.messageId,
          accountId: account.id 
        }
      });

      if (existingMessage) {
        return; // Message already processed
      }

      // Create new message
      const message = this.messageRepository.create({
        accountId: account.id,
        platformMessageId: data.messageId,
        type: MessageType.DM,
        content: data.content || data.message || '',
        senderUsername: data.senderId || data.from?.id || 'unknown',
        senderDisplayName: data.senderName || data.from?.name || 'Unknown',
        receivedAt: new Date(data.timestamp || Date.now()),
        status: MessageStatus.UNREAD,
        priority: MessagePriority.MEDIUM,
        metadata: {
          threadId: data.conversationId,
          parentMessageId: data.messageType === 'INMAIL' ? data.messageId : undefined
        }
      });

      await this.messageRepository.save(message);
      console.log(`Processed LinkedIn message webhook for account ${account.id}`);
    } catch (error) {
      console.error('Error processing LinkedIn message webhook:', error);
    }
  }

  /**
   * Process connection request webhook
   */
  private async processConnectionRequestWebhook(data: any): Promise<void> {
    try {
      // Handle connection request logic here
      console.log('LinkedIn connection request received:', data);
      // Could create a message or notification for the connection request
    } catch (error) {
      console.error('Error processing LinkedIn connection request webhook:', error);
    }
  }

  /**
   * Map LinkedIn API message to our message format
   */
  private mapLinkedInMessage(msg: any): LinkedInMessage {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      from: {
        id: msg.from?.id || msg.sender?.id || '',
        name: msg.from?.name || `${msg.sender?.firstName?.localized?.en_US || ''} ${msg.sender?.lastName?.localized?.en_US || ''}`.trim() || 'Unknown',
        profileUrl: msg.from?.publicProfileUrl || msg.sender?.publicProfileUrl
      },
      to: {
        id: msg.to?.id || msg.recipient?.id || '',
        name: msg.to?.name || `${msg.recipient?.firstName?.localized?.en_US || ''} ${msg.recipient?.lastName?.localized?.en_US || ''}`.trim() || 'Unknown'
      },
      content: msg.body || msg.message || msg.content || '',
      sentAt: new Date(msg.sentAt || msg.createdAt || Date.now()),
      messageType: msg.messageType || 'MEMBER_TO_MEMBER',
      attachments: msg.attachments?.map((att: any) => ({
        type: att.type || 'DOCUMENT',
        url: att.url || att.downloadUrl,
        fileName: att.fileName || att.name
      })) || []
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret
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
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in || 5184000
      };
    } catch (error) {
      console.error('Error refreshing LinkedIn access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Validate LinkedIn webhook challenge
   */
  validateWebhookChallenge(challengeCode: string): string {
    return crypto
      .createHmac('sha256', this.oauthConfig.clientSecret)
      .update(challengeCode)
      .digest('hex');
  }
} 