import { Repository } from 'typeorm';
import { Account, Platform, AccountStatus } from '../entities/account.entity';
import { User } from '../entities/user.entity';
import { AppDataSource } from '../config/database';
import { LinkedInService } from './linkedin.service';

export interface CreateAccountData {
  userId: string;
  platform: Platform;
  platformId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface UpdateAccountData {
  username?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  status?: AccountStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  lastActivityAt?: Date;
}

export interface PlatformOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

export class AccountService {
  private accountRepository: Repository<Account>;
  private userRepository: Repository<User>;
  private linkedInService: LinkedInService;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.userRepository = AppDataSource.getRepository(User);
    this.linkedInService = new LinkedInService();
  }

  /**
   * Get all accounts for a user
   */
  async getUserAccounts(userId: string): Promise<Account[]> {
    return this.accountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: string, userId: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { id: accountId, userId }
    });
  }

  /**
   * Create a new social media account
   */
  async createAccount(accountData: CreateAccountData): Promise<Account> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: accountData.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if account already exists for this platform and platformId
    const existingAccount = await this.accountRepository.findOne({
      where: { 
        userId: accountData.userId,
        platform: accountData.platform,
        platformId: accountData.platformId
      }
    });

    if (existingAccount) {
      throw new Error(`Account ${accountData.username} is already connected for ${accountData.platform}`);
    }

    const account = this.accountRepository.create({
      ...accountData,
      status: AccountStatus.CONNECTED,
      lastActivityAt: new Date(),
      metadata: {
        permissions: [],
        lastSync: new Date(),
        syncFrequency: 300 // 5 minutes default
      }
    });

    return this.accountRepository.save(account);
  }

  /**
   * Update account information
   */
  async updateAccount(accountId: string, userId: string, updateData: UpdateAccountData): Promise<Account> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    Object.assign(account, updateData);
    account.updatedAt = new Date();

    return this.accountRepository.save(account);
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: string, userId: string): Promise<boolean> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    await this.accountRepository.remove(account);
    return true;
  }

  /**
   * Get accounts by platform
   */
  async getAccountsByPlatform(userId: string, platform: Platform): Promise<Account[]> {
    return this.accountRepository.find({
      where: { userId, platform },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Update account status
   */
  async updateAccountStatus(accountId: string, userId: string, status: AccountStatus): Promise<Account> {
    return this.updateAccount(accountId, userId, { status, lastActivityAt: new Date() });
  }

  /**
   * Refresh account tokens
   */
  async refreshAccountTokens(accountId: string, userId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<Account> {
    return this.updateAccount(accountId, userId, {
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
      status: AccountStatus.CONNECTED,
      lastActivityAt: new Date()
    });
  }

  /**
   * Get OAuth configuration for a platform
   */
  getPlatformOAuthConfig(platform: Platform): PlatformOAuthConfig {
    const configs: Record<Platform, PlatformOAuthConfig> = {
      [Platform.INSTAGRAM]: {
        clientId: process.env.INSTAGRAM_CLIENT_ID || '',
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.BASE_URL}/auth/instagram/callback`,
        scope: ['user_profile', 'user_media'],
        authUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token'
      },
      [Platform.TIKTOK]: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri: process.env.TIKTOK_REDIRECT_URI || `${process.env.BASE_URL}/auth/tiktok/callback`,
        scope: ['user.info.basic', 'video.list'],
        authUrl: 'https://www.tiktok.com/auth/authorize/',
        tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/'
      },
      [Platform.YOUTUBE]: {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || `${process.env.BASE_URL}/auth/youtube/callback`,
        scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl'],
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
      },
      [Platform.TWITTER]: {
        clientId: process.env.TWITTER_CLIENT_ID || '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        redirectUri: process.env.TWITTER_REDIRECT_URI || `${process.env.BASE_URL}/auth/twitter/callback`,
        scope: ['tweet.read', 'users.read', 'dm.read', 'dm.write'],
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token'
      },
      [Platform.FACEBOOK]: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || `${process.env.BASE_URL}/auth/facebook/callback`,
        scope: ['pages_manage_metadata', 'pages_read_engagement', 'pages_manage_posts'],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
      },
      [Platform.LINKEDIN]: {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || `${process.env.BASE_URL}/auth/linkedin/callback`,
        scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken'
      }
    };

    return configs[platform];
  }

  /**
   * Generate OAuth authorization URL
   */
  generateOAuthUrl(platform: Platform, state: string): string {
    // For LinkedIn, use the specialized service
    if (platform === Platform.LINKEDIN) {
      try {
        // Decode the state to extract userId
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        return this.linkedInService.generateAuthUrl(stateData.userId);
      } catch (error) {
        console.error('Error decoding state for LinkedIn OAuth:', error);
        throw new Error('Invalid state parameter for LinkedIn OAuth');
      }
    }

    const config = this.getPlatformOAuthConfig(platform);
    
    if (!config.clientId) {
      throw new Error(`OAuth not configured for ${platform}. Please set the required environment variables.`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      response_type: 'code',
      state: state
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle LinkedIn OAuth callback and create account
   */
  async handleLinkedInOAuth(code: string, state: string): Promise<Account> {
    try {
      // Exchange code for token using LinkedIn service
      const tokenData = await this.linkedInService.exchangeCodeForToken(code, state);
      
      // Get profile information
      const profile = await this.linkedInService.getUserProfile(tokenData.accessToken);
      
      // Create account data
      const accountData: CreateAccountData = {
        userId: tokenData.userId,
        platform: Platform.LINKEDIN,
        platformId: profile.id,
        username: `${profile.firstName}-${profile.lastName}`.toLowerCase().replace(/\s+/g, '-'),
        displayName: `${profile.firstName} ${profile.lastName}`,
        bio: profile.headline,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + (tokenData.expiresIn * 1000))
      };

      // Create the account
      const account = await this.createAccount(accountData);
      
      // Start initial sync of messages
      this.linkedInService.syncMessages(account.id).catch(error => {
        console.error('Failed to sync LinkedIn messages after account creation:', error);
      });

      return account;
    } catch (error) {
      console.error('Error handling LinkedIn OAuth:', error);
      throw new Error('Failed to connect LinkedIn account');
    }
  }

  /**
   * Get account statistics for a user
   */
  async getAccountStats(userId: string): Promise<{
    totalAccounts: number;
    connectedAccounts: number;
    platformBreakdown: Record<Platform, number>;
    recentlyAdded: Account[];
  }> {
    const accounts = await this.getUserAccounts(userId);
    
    const platformBreakdown = accounts.reduce((acc, account) => {
      acc[account.platform] = (acc[account.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>);

    const connectedAccounts = accounts.filter(account => account.status === AccountStatus.CONNECTED);
    const recentlyAdded = accounts.slice(0, 3); // Last 3 added accounts

    return {
      totalAccounts: accounts.length,
      connectedAccounts: connectedAccounts.length,
      platformBreakdown,
      recentlyAdded
    };
  }

  /**
   * Check for accounts that need token refresh
   */
  async getAccountsNeedingRefresh(userId: string): Promise<Account[]> {
    const accounts = await this.accountRepository.find({
      where: { 
        userId,
        status: AccountStatus.CONNECTED
      }
    });
    
    return accounts.filter(account => account.needsRefresh);
  }

  /**
   * Sync account data from platform
   */
  async syncAccountData(accountId: string, userId: string): Promise<Account> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    // TODO: Implement actual platform API calls to sync data
    // For now, just update the last sync time
    
    return this.updateAccount(accountId, userId, {
      lastSyncAt: new Date(),
      status: AccountStatus.CONNECTED
    });
  }
} 