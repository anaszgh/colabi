import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn
} from 'typeorm';
import { Account } from './account.entity';

export enum MessageType {
  DM = 'dm',
  COMMENT = 'comment',
  MENTION = 'mention',
  REPLY = 'reply'
}

export enum MessagePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum MessageCategory {
  BUSINESS = 'business',
  FAN_QUESTION = 'fan_question',
  COLLABORATION = 'collaboration',
  SPAM = 'spam',
  GENERAL = 'general',
  URGENT = 'urgent'
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
  FLAGGED = 'flagged'
}

@Entity('messages')
@Index(['accountId', 'createdAt'])
@Index(['status', 'priority'])
@Index(['category', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  accountId: string;

  @Column({ type: 'varchar' })
  platformMessageId: string; // Original message ID from the platform

  @Column({
    type: 'enum',
    enum: MessageType
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar' })
  senderUsername: string;

  @Column({ type: 'varchar', nullable: true })
  senderDisplayName?: string;

  @Column({ type: 'varchar', nullable: true })
  senderAvatar?: string;

  @Column({ type: 'int', nullable: true })
  senderFollowersCount?: number;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.MEDIUM
  })
  priority: MessagePriority;

  @Column({
    type: 'enum',
    enum: MessageCategory,
    nullable: true
  })
  category?: MessageCategory;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.UNREAD
  })
  status: MessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  aiAnalysis?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intent: string;
    businessValue: number; // 0-100
    confidence: number; // 0-100
    keywords: string[];
    suggestedResponse?: string;
    autoReplyEligible: boolean;
  };

  @Column({ type: 'text', nullable: true })
  response?: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @Column({ type: 'boolean', default: false })
  autoReplied: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    parentMessageId?: string;
    threadId?: string;
    mediaUrls?: string[];
    location?: string;
    postUrl?: string;
  };

  @Column({ type: 'timestamp' })
  receivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Account, account => account.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  // Computed properties
  get isUnread(): boolean {
    return this.status === MessageStatus.UNREAD;
  }

  get isHighPriority(): boolean {
    return this.priority === MessagePriority.HIGH;
  }

  get isBusiness(): boolean {
    return this.category === MessageCategory.BUSINESS;
  }

  get hasBeenReplied(): boolean {
    return this.status === MessageStatus.REPLIED;
  }

  get businessScore(): number {
    return this.aiAnalysis?.businessValue || 0;
  }
}