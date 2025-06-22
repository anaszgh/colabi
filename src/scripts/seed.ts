import 'reflect-metadata';
import { AppDataSource, connectDatabase } from '../config/database';
import { UserService } from '../services/user.service';
import { UserRole } from '../entities/user.entity';
import { Template, TemplateType } from '../entities/template.entity';
import { MessageCategory, MessageType, MessagePriority, MessageStatus } from '../entities/message.entity';
import { Account, Platform, AccountStatus } from '../entities/account.entity';
import { Message } from '../entities/message.entity';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database connection
    await connectDatabase();

    const userService = new UserService();
    const templateRepository = AppDataSource.getRepository(Template);
    const accountRepository = AppDataSource.getRepository(Account);
    const messageRepository = AppDataSource.getRepository(Message);

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await userService.createUser({
      email: 'admin@colabi.com',
      password: 'admin123',
      name: 'Admin User',
      role: UserRole.ADMIN,
      company: 'Colabi Inc.'
    });

    // Create sample influencer
    console.log('🎭 Creating sample influencer...');
    const influencerUser = await userService.createUser({
      email: 'maya@influencer.com',
      password: 'maya123',
      name: 'Maya Rodriguez',
      role: UserRole.INFLUENCER
    });

    // Create sample agency
    console.log('🏢 Creating sample agency...');
    const agencyUser = await userService.createUser({
      email: 'contact@creativehub.com',
      password: 'agency123',
      name: 'Creative Hub Agency',
      role: UserRole.AGENCY,
      company: 'Creative Hub Agency'
    });

    // Create sample accounts for the influencer
    console.log('📱 Creating sample social media accounts...');
    const instagramAccount = accountRepository.create({
      userId: influencerUser.id,
      platform: Platform.INSTAGRAM,
      platformId: 'maya_lifestyle_ig',
      username: 'maya_lifestyle',
      displayName: 'Maya Rodriguez',
      followersCount: 145000,
      followingCount: 892,
      status: AccountStatus.CONNECTED,
      metadata: {
        permissions: ['read_messages', 'send_messages'],
        lastSync: new Date()
      }
    });

    const tiktokAccount = accountRepository.create({
      userId: influencerUser.id,
      platform: Platform.TIKTOK,
      platformId: 'maya_lifestyle_tt',
      username: 'maya_lifestyle_tt',
      displayName: 'Maya Rodriguez',
      followersCount: 89000,
      followingCount: 234,
      status: AccountStatus.CONNECTED,
      metadata: {
        permissions: ['read_messages', 'send_messages'],
        lastSync: new Date()
      }
    });

    const youtubeAccount = accountRepository.create({
      userId: influencerUser.id,
      platform: Platform.YOUTUBE,
      platformId: 'maya_lifestyle_yt',
      username: 'MayaLifestyle',
      displayName: 'Maya Rodriguez - Lifestyle',
      followersCount: 56000,
      followingCount: 156,
      status: AccountStatus.CONNECTED,
      metadata: {
        permissions: ['read_messages', 'send_messages'],
        lastSync: new Date()
      }
    });

    await accountRepository.save([instagramAccount, tiktokAccount, youtubeAccount]);

    // Create sample messages with different categories
    console.log('💬 Creating sample messages...');
    
    const messages = [
      // Business opportunities
      {
        accountId: instagramAccount.id,
        platformMessageId: 'ig_msg_001',
        type: MessageType.DM,
        content: 'Hi Maya! We\'re interested in partnering with you for our new skincare line. Would you be open to discussing collaboration opportunities? We can offer $5,000 for a post and story series.',
        senderUsername: 'beautybrand_official',
        senderDisplayName: 'Beauty Brand',
        senderFollowersCount: 25000,
        priority: MessagePriority.HIGH,
        category: MessageCategory.BUSINESS,
        status: MessageStatus.UNREAD,
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'business_inquiry',
          businessValue: 95,
          confidence: 88,
          keywords: ['partnership', 'collaboration', 'skincare', '$5,000'],
          autoReplyEligible: false
        }
      },
      {
        accountId: tiktokAccount.id,
        platformMessageId: 'tt_msg_001',
        type: MessageType.DM,
        content: 'Hello! I represent a fashion brand and we\'d love to send you some pieces for potential collaboration. Are you currently accepting brand partnerships?',
        senderUsername: 'fashionista_brands',
        senderDisplayName: 'Fashionista Brands',
        senderFollowersCount: 15000,
        priority: MessagePriority.HIGH,
        category: MessageCategory.COLLABORATION,
        status: MessageStatus.READ,
        receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'collaboration_inquiry',
          businessValue: 75,
          confidence: 82,
          keywords: ['fashion', 'brand', 'collaboration', 'partnership'],
          autoReplyEligible: false
        }
      },
      
      // Fan questions and general messages
      {
        accountId: instagramAccount.id,
        platformMessageId: 'ig_msg_002',
        type: MessageType.DM,
        content: 'Love your morning routine video! Where did you get that amazing coffee mug?',
        senderUsername: 'coffee_lover_23',
        senderDisplayName: 'Sarah Johnson',
        senderFollowersCount: 234,
        priority: MessagePriority.MEDIUM,
        category: MessageCategory.FAN_QUESTION,
        status: MessageStatus.REPLIED,
        receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        respondedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        response: 'Thanks so much! It\'s from @ceramicstudio - they have amazing handmade pieces! ☕✨',
        autoReplied: false,
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'product_inquiry',
          businessValue: 25,
          confidence: 75,
          keywords: ['morning routine', 'coffee mug'],
          autoReplyEligible: true
        }
      },
      {
        accountId: instagramAccount.id,
        platformMessageId: 'ig_msg_003',
        type: MessageType.DM,
        content: 'Your content always brightens my day! Thank you for being so authentic and inspiring 💕',
        senderUsername: 'inspired_daily',
        senderDisplayName: 'Emma Wilson',
        senderFollowersCount: 89,
        priority: MessagePriority.LOW,
        category: MessageCategory.GENERAL,
        status: MessageStatus.REPLIED,
        receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        respondedAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000), // 30 min ago
        response: 'This means the world to me! Thank you for your support 💕',
        autoReplied: true,
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'appreciation',
          businessValue: 10,
          confidence: 95,
          keywords: ['authentic', 'inspiring', 'support'],
          autoReplyEligible: true
        }
      },
      {
        accountId: youtubeAccount.id,
        platformMessageId: 'yt_msg_001',
        type: MessageType.COMMENT,
        content: 'What camera do you use for filming? The quality is amazing!',
        senderUsername: 'aspiring_creator',
        senderDisplayName: 'Alex Chen',
        senderFollowersCount: 456,
        priority: MessagePriority.MEDIUM,
        category: MessageCategory.FAN_QUESTION,
        status: MessageStatus.UNREAD,
        receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'equipment_inquiry',
          businessValue: 20,
          confidence: 80,
          keywords: ['camera', 'filming', 'quality'],
          autoReplyEligible: true
        }
      },
      
      // Spam messages
      {
        accountId: instagramAccount.id,
        platformMessageId: 'ig_msg_004',
        type: MessageType.DM,
        content: 'Hey! Want to buy followers and likes? We offer the best prices! Click here: suspicious-link.com',
        senderUsername: 'followers_boost_999',
        senderDisplayName: 'Followers Boost',
        senderFollowersCount: 12,
        priority: MessagePriority.LOW,
        category: MessageCategory.SPAM,
        status: MessageStatus.ARCHIVED,
        receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        aiAnalysis: {
          sentiment: 'negative' as const,
          intent: 'spam',
          businessValue: 0,
          confidence: 98,
          keywords: ['buy followers', 'suspicious link', 'boost'],
          autoReplyEligible: false
        }
      },
      
      // More recent messages for activity
      {
        accountId: tiktokAccount.id,
        platformMessageId: 'tt_msg_002',
        type: MessageType.DM,
        content: 'Hi! I work for a wellness brand and would love to discuss a potential partnership. We align perfectly with your values!',
        senderUsername: 'wellness_collective',
        senderDisplayName: 'Wellness Collective',
        senderFollowersCount: 8900,
        priority: MessagePriority.HIGH,
        category: MessageCategory.BUSINESS,
        status: MessageStatus.UNREAD,
        receivedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'business_inquiry',
          businessValue: 85,
          confidence: 90,
          keywords: ['wellness', 'partnership', 'brand', 'values'],
          autoReplyEligible: false
        }
      },
      {
        accountId: instagramAccount.id,
        platformMessageId: 'ig_msg_005',
        type: MessageType.DM,
        content: 'Just wanted to say your workout routine helped me so much! Any tips for staying motivated?',
        senderUsername: 'fitness_journey_2024',
        senderDisplayName: 'Jessica Martinez',
        senderFollowersCount: 145,
        priority: MessagePriority.MEDIUM,
        category: MessageCategory.FAN_QUESTION,
        status: MessageStatus.REPLIED,
        receivedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        respondedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        response: 'So happy it helped! My biggest tip: start small and be consistent. You\'ve got this! 💪',
        autoReplied: false,
        aiAnalysis: {
          sentiment: 'positive' as const,
          intent: 'advice_request',
          businessValue: 30,
          confidence: 85,
          keywords: ['workout', 'motivation', 'tips'],
          autoReplyEligible: true
        }
      }
    ];

    for (const messageData of messages) {
      const message = messageRepository.create(messageData);
      await messageRepository.save(message);
    }

    // Create default response templates
    console.log('📝 Creating default response templates...');
    
    const defaultTemplates = [
      {
        name: 'Business Inquiry Auto Reply',
        description: 'Automatic response for business inquiries',
        type: TemplateType.AUTO_REPLY,
        category: MessageCategory.BUSINESS,
        content: 'Hi! Thank you for reaching out about collaboration opportunities. I\'ll review your proposal and get back to you within 24-48 hours. For urgent inquiries, please email maya@mayalifestyle.com.',
        triggers: ['collaboration', 'partnership', 'sponsor', 'brand deal', 'business'],
        variables: ['email'],
        userId: influencerUser.id,
        isDefault: true,
        platforms: ['instagram', 'tiktok', 'youtube']
      },
      {
        name: 'Fan Question Response',
        description: 'Quick response for common fan questions',
        type: TemplateType.QUICK_RESPONSE,
        category: MessageCategory.FAN_QUESTION,
        content: 'Thanks for your question! I love connecting with my followers. You can find more details about this in my recent posts or stories. Keep being amazing! 💕',
        triggers: ['where', 'how', 'what', 'when', 'product'],
        variables: [],
        userId: influencerUser.id,
        isDefault: true,
        platforms: ['instagram', 'tiktok']
      },
      {
        name: 'General Thank You',
        description: 'General appreciation message',
        type: TemplateType.AUTO_REPLY,
        category: MessageCategory.GENERAL,
        content: 'Thank you so much for your support! It means the world to me. Stay tuned for more exciting content! ✨',
        triggers: ['love', 'amazing', 'great', 'awesome', 'beautiful'],
        variables: [],
        userId: influencerUser.id,
        isDefault: true,
        platforms: ['instagram', 'tiktok', 'youtube', 'twitter']
      },
      {
        name: 'Collaboration Inquiry',
        description: 'Professional response for collaboration requests',
        type: TemplateType.BUSINESS_INQUIRY,
        category: MessageCategory.COLLABORATION,
        content: 'Hello! I\'m interested in learning more about this collaboration opportunity. Please send me the campaign details, timeline, and compensation structure to maya@mayalifestyle.com. Looking forward to hearing from you!',
        triggers: ['collab', 'work together', 'partner with'],
        variables: ['email'],
        userId: influencerUser.id,
        isDefault: true,
        platforms: ['instagram', 'linkedin']
      },
      {
        name: 'Agency Client Response',
        description: 'Professional response for agency clients',
        type: TemplateType.BUSINESS_INQUIRY,
        category: MessageCategory.BUSINESS,
        content: 'Thank you for your interest in our influencer management services. One of our account managers will reach out to you within 24 hours to discuss your campaign needs. You can also schedule a consultation at creativehub.com/contact.',
        triggers: ['agency', 'management', 'campaign', 'influencer marketing'],
        variables: ['website'],
        userId: agencyUser.id,
        isDefault: true,
        platforms: ['linkedin', 'instagram', 'twitter']
      }
    ];

    for (const templateData of defaultTemplates) {
      const template = templateRepository.create(templateData);
      await templateRepository.save(template);
      console.log(`✅ Created template: ${template.name}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Created accounts:');
    console.log(`   Admin: admin@colabi.com / admin123`);
    console.log(`   Influencer: maya@influencer.com / maya123`);
    console.log(`   Agency: contact@creativehub.com / agency123`);
    console.log(`\n📊 Created sample data:`);
    console.log(`   ✅ 3 Social media accounts connected`);
    console.log(`   ✅ ${messages.length} Sample messages across different categories`);
    console.log(`   ✅ ${defaultTemplates.length} Response templates`);
    console.log('\n🎯 Dashboard metrics will now show real data!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log('🌱 Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  });