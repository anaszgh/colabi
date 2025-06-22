import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';
import { Agent } from './agent.entity';

export enum Platform {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin'
}

export enum AccountStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  EXPIRED = 'expired'
}

@Entity('accounts')
@Index(['userId', 'platform'])
@Index(['platformId', 'platform'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({
    type: 'enum',
    enum: Platform
  })
  platform: Platform;

  @Column({ type: 'varchar' })
  platformId: string; // The account ID on the platform

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  displayName?: string;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string;

  @Column({ type: 'varchar', nullable: true })
  bio?: string;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.CONNECTED
  })
  status: AccountStatus;

  @Column({ type: 'text', nullable: true })
  accessToken?: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    permissions: string[];
    webhookUrl?: string;
    lastSync?: Date;
    syncFrequency?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Message, message => message.account)
  messages: Message[];

  @OneToMany(() => Agent, agent => agent.assignedAccount)
  assignedAgents?: Agent[];

  // Computed properties
  get isActive(): boolean {
    return this.status === AccountStatus.CONNECTED;
  }

  get needsRefresh(): boolean {
    return this.tokenExpiresAt ? new Date() > this.tokenExpiresAt : false;
  }

  get platformDisplayName(): string {
    const names = {
      [Platform.INSTAGRAM]: 'Instagram',
      [Platform.TIKTOK]: 'TikTok',
      [Platform.YOUTUBE]: 'YouTube',
      [Platform.TWITTER]: 'Twitter',
      [Platform.FACEBOOK]: 'Facebook',
      [Platform.LINKEDIN]: 'LinkedIn'
    };
    return names[this.platform];
  }
}