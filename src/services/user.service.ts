import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Message, MessageCategory, MessageStatus } from '../entities/message.entity';
import { Account, AccountStatus } from '../entities/account.entity';
import bcrypt from 'bcrypt';

export interface DashboardMetrics {
  messagesReceived: number;
  businessOpportunities: number;
  fanbaseMessages: number;
  spamMessages: number;
  accountsConnected: number;
  messagesResponded: number;
  avgResponseTime: number; // in minutes
  responseRate: number; // percentage
}

export class UserService {
  private userRepository: Repository<User>;
  private messageRepository: Repository<Message>;
  private accountRepository: Repository<Account>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(Message);
    this.accountRepository = AppDataSource.getRepository(Account);
  }

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    company?: string;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      role: userData.role || UserRole.INFLUENCER,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        autoReply: false,
        timezone: 'UTC'
      }
    });

    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['accounts', 'templates']
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['accounts', 'templates']
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive fields from update data
    const { password, ...safeUpdateData } = updateData as any;

    await this.userRepository.update(id, safeUpdateData);
    
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    return updatedUser;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(id, { 
      password: hashedPassword
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { 
      lastLoginAt: new Date()
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, { 
      emailVerified: true
    });
  }

  async setEmailVerificationToken(id: string, token: string): Promise<void> {
    await this.userRepository.update(id, { 
      emailVerificationToken: token
    });
  }

  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await this.userRepository.update(id, { 
      passwordResetToken: token,
      passwordResetExpires: expires
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { 
        passwordResetToken: token,
      }
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { 
        emailVerificationToken: token,
      }
    });
  }

  /**
   * Get comprehensive dashboard metrics for a user
   */
  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    try {
      // Get user's accounts
      const userAccounts = await this.accountRepository.find({
        where: { userId },
        select: ['id']
      });

      const accountIds = userAccounts.map(account => account.id);

      if (accountIds.length === 0) {
        // No accounts connected, return zero metrics
        return {
          messagesReceived: 0,
          businessOpportunities: 0,
          fanbaseMessages: 0,
          spamMessages: 0,
          accountsConnected: 0,
          messagesResponded: 0,
          avgResponseTime: 0,
          responseRate: 0
        };
      }

      // Run all metric queries in parallel for better performance
      const [
        totalMessages,
        businessMessages,
        fanMessages,
        spamMessages,
        connectedAccounts,
        respondedMessages,
        responseTimeData
      ] = await Promise.all([
        // Total messages received
        this.messageRepository.count({
          where: { accountId: { $in: accountIds } as any }
        }),

        // Business opportunities (BUSINESS + COLLABORATION categories)
        this.messageRepository.count({
          where: { 
            accountId: { $in: accountIds } as any,
            category: { $in: [MessageCategory.BUSINESS, MessageCategory.COLLABORATION] } as any
          }
        }),

        // Fanbase messages (FAN_QUESTION + GENERAL categories)
        this.messageRepository.count({
          where: { 
            accountId: { $in: accountIds } as any,
            category: { $in: [MessageCategory.FAN_QUESTION, MessageCategory.GENERAL] } as any
          }
        }),

        // Spam messages
        this.messageRepository.count({
          where: { 
            accountId: { $in: accountIds } as any,
            category: MessageCategory.SPAM
          }
        }),

        // Connected accounts (only active ones)
        this.accountRepository.count({
          where: { 
            userId,
            status: AccountStatus.CONNECTED
          }
        }),

        // Messages that have been responded to
        this.messageRepository.count({
          where: { 
            accountId: { $in: accountIds } as any,
            status: MessageStatus.REPLIED
          }
        }),

        // Response time calculation - get messages with response times
        this.messageRepository
          .createQueryBuilder('message')
          .select('AVG(EXTRACT(epoch FROM (message.respondedAt - message.receivedAt)) / 60)', 'avgMinutes')
          .where('message.accountId IN (:...accountIds)', { accountIds })
          .andWhere('message.respondedAt IS NOT NULL')
          .andWhere('message.receivedAt IS NOT NULL')
          .getRawOne()
      ]);

      // Calculate response rate (percentage)
      const responseRate = totalMessages > 0 
        ? Math.round((respondedMessages / totalMessages) * 100)
        : 0;

      // Calculate average response time in minutes
      const avgResponseTime = responseTimeData?.avgMinutes 
        ? Math.round(parseFloat(responseTimeData.avgMinutes))
        : 0;

      return {
        messagesReceived: totalMessages,
        businessOpportunities: businessMessages,
        fanbaseMessages: fanMessages,
        spamMessages: spamMessages,
        accountsConnected: connectedAccounts,
        messagesResponded: respondedMessages,
        avgResponseTime,
        responseRate
      };

    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      // Return zero metrics on error
      return {
        messagesReceived: 0,
        businessOpportunities: 0,
        fanbaseMessages: 0,
        spamMessages: 0,
        accountsConnected: 0,
        messagesResponded: 0,
        avgResponseTime: 0,
        responseRate: 0
      };
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   */
  async getUserStats(id: string): Promise<{
    totalAccounts: number;
    totalMessages: number;
  }> {
    const metrics = await this.getDashboardMetrics(id);
    return {
      totalAccounts: metrics.accountsConnected,
      totalMessages: metrics.messagesReceived
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.remove(user);
  }

  async listUsers(options: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
  } = {}): Promise<{ users: User[], total: number, pages: number }> {
    const { page = 1, limit = 10, role, status } = options;
    const skip = (page - 1) * limit;

    const query = this.userRepository.createQueryBuilder('user');

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [users, total] = await query.getManyAndCount();
    const pages = Math.ceil(total / limit);

    return { users, total, pages };
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(userId: string, limit: number = 10): Promise<Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>> {
    try {
      // Get user's accounts
      const userAccounts = await this.accountRepository.find({
        where: { userId },
        select: ['id', 'platform', 'username']
      });

      if (userAccounts.length === 0) {
        return [];
      }

      const accountIds = userAccounts.map(account => account.id);

      // Get recent messages for activity
      const recentMessages = await this.messageRepository.find({
        where: { accountId: { $in: accountIds } as any },
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['account']
      });

      // Convert messages to activity items
      const activities = recentMessages.map(message => {
        let activityMessage = '';
        let type = 'message';

        switch (message.category) {
          case MessageCategory.BUSINESS:
            activityMessage = `New business inquiry from @${message.senderUsername}`;
            type = 'business';
            break;
          case MessageCategory.COLLABORATION:
            activityMessage = `Collaboration opportunity from @${message.senderUsername}`;
            type = 'collaboration';
            break;
          case MessageCategory.FAN_QUESTION:
            activityMessage = `Fan question from @${message.senderUsername}`;
            type = 'fan';
            break;
          case MessageCategory.SPAM:
            activityMessage = `Spam message detected from @${message.senderUsername}`;
            type = 'spam';
            break;
          default:
            activityMessage = `New message from @${message.senderUsername}`;
            type = 'message';
        }

        if (message.autoReplied) {
          activityMessage += ' (auto-replied)';
        }

        return {
          type,
          message: activityMessage,
          timestamp: message.createdAt
        };
      });

      return activities;

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
}