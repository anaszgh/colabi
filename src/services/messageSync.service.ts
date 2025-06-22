import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account, Platform, AccountStatus } from '../entities/account.entity';
import { LinkedInService } from './linkedin.service';

export interface SyncResult {
  accountId: string;
  platform: Platform;
  success: boolean;
  newMessages: number;
  error?: string;
}

export class MessageSyncService {
  private accountRepository: Repository<Account>;
  private linkedInService: LinkedInService;
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.linkedInService = new LinkedInService();
  }

  /**
   * Start the message sync service with a specified interval
   */
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Message sync service is already running');
      return;
    }

    console.log(`Starting message sync service with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run initial sync
    this.syncAllAccounts().catch(error => {
      console.error('Error during initial message sync:', error);
    });

    // Set up recurring sync
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAllAccounts();
      } catch (error) {
        console.error('Error during scheduled message sync:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the message sync service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Message sync service is not running');
      return;
    }

    console.log('Stopping message sync service');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manually trigger sync for all accounts
   */
  async syncAllAccounts(): Promise<SyncResult[]> {
    try {
      console.log('Starting message sync for all connected accounts...');
      
      // Get all connected accounts
      const accounts = await this.accountRepository.find({
        where: { status: AccountStatus.CONNECTED }
      });

      if (accounts.length === 0) {
        console.log('No connected accounts found for syncing');
        return [];
      }

      console.log(`Found ${accounts.length} connected accounts to sync`);

      // Process accounts in batches to avoid overwhelming APIs
      const batchSize = 5;
      const results: SyncResult[] = [];

      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        console.log(`Processing sync batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(accounts.length / batchSize)}`);

        const batchPromises = batch.map(account => this.syncAccountMessages(account));
        const batchResults = await Promise.allSettled(batchPromises);

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const account = batch[j];

          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Failed to sync account ${account.id}:`, result.reason);
            results.push({
              accountId: account.id,
              platform: account.platform,
              success: false,
              newMessages: 0,
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            });
          }
        }

        // Add a small delay between batches to be respectful to APIs
        if (i + batchSize < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      const totalNew = results.reduce((sum, result) => sum + result.newMessages, 0);
      const successCount = results.filter(result => result.success).length;
      
      console.log(`Message sync completed: ${successCount}/${accounts.length} accounts synced successfully, ${totalNew} new messages`);

      return results;
    } catch (error) {
      console.error('Error syncing all accounts:', error);
      throw error;
    }
  }

  /**
   * Sync messages for a specific account based on platform
   */
  async syncAccountMessages(account: Account): Promise<SyncResult> {
    try {
      console.log(`Syncing messages for ${account.platform} account: ${account.username} (${account.id})`);

      let result: { success: boolean; newMessages: number; error?: string };

      switch (account.platform) {
        case Platform.LINKEDIN:
          result = await this.linkedInService.syncMessages(account.id);
          break;
        
        case Platform.INSTAGRAM:
          // TODO: Implement Instagram message sync
          result = { success: true, newMessages: 0 };
          console.log(`Instagram sync not yet implemented for account ${account.id}`);
          break;
        
        case Platform.TIKTOK:
          // TODO: Implement TikTok message sync
          result = { success: true, newMessages: 0 };
          console.log(`TikTok sync not yet implemented for account ${account.id}`);
          break;
        
        case Platform.YOUTUBE:
          // TODO: Implement YouTube comment sync
          result = { success: true, newMessages: 0 };
          console.log(`YouTube sync not yet implemented for account ${account.id}`);
          break;
        
        case Platform.TWITTER:
          // TODO: Implement Twitter message sync
          result = { success: true, newMessages: 0 };
          console.log(`Twitter sync not yet implemented for account ${account.id}`);
          break;
        
        case Platform.FACEBOOK:
          // TODO: Implement Facebook message sync
          result = { success: true, newMessages: 0 };
          console.log(`Facebook sync not yet implemented for account ${account.id}`);
          break;
        
        default:
          result = { 
            success: false, 
            newMessages: 0, 
            error: `Unsupported platform: ${account.platform}` 
          };
      }

      if (result.success && result.newMessages > 0) {
        console.log(`✅ Synced ${result.newMessages} new messages from ${account.platform} account ${account.username}`);
      } else if (result.success) {
        console.log(`✅ No new messages from ${account.platform} account ${account.username}`);
      } else {
        console.error(`❌ Failed to sync ${account.platform} account ${account.username}: ${result.error}`);
      }

      return {
        accountId: account.id,
        platform: account.platform,
        success: result.success,
        newMessages: result.newMessages,
        error: result.error
      };
    } catch (error) {
      console.error(`Error syncing account ${account.id}:`, error);
      return {
        accountId: account.id,
        platform: account.platform,
        success: false,
        newMessages: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync messages for a specific platform
   */
  async syncByPlatform(platform: Platform): Promise<SyncResult[]> {
    try {
      const accounts = await this.accountRepository.find({
        where: { 
          platform,
          status: AccountStatus.CONNECTED 
        }
      });

      console.log(`Syncing ${accounts.length} ${platform} accounts`);

      const results: SyncResult[] = [];
      for (const account of accounts) {
        const result = await this.syncAccountMessages(account);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`Error syncing ${platform} accounts:`, error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    isRunning: boolean;
    totalAccounts: number;
    connectedAccounts: number;
    platformBreakdown: Record<Platform, number>;
    lastSyncTimes: Record<string, Date | null>;
  }> {
    const accounts = await this.accountRepository.find();
    const connectedAccounts = accounts.filter(acc => acc.status === AccountStatus.CONNECTED);

    const platformBreakdown = connectedAccounts.reduce((acc, account) => {
      acc[account.platform] = (acc[account.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>);

    const lastSyncTimes = connectedAccounts.reduce((acc, account) => {
      acc[account.id] = account.lastSyncAt || null;
      return acc;
    }, {} as Record<string, Date | null>);

    return {
      isRunning: this.isRunning,
      totalAccounts: accounts.length,
      connectedAccounts: connectedAccounts.length,
      platformBreakdown,
      lastSyncTimes
    };
  }

  /**
   * Check if service is running
   */
  get status(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService(); 