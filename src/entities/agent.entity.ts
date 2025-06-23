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
import { Account } from './account.entity';
import { TrainingSession } from './training-session.entity';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRAINING = 'training'
}

@Entity('agents')
@Index(['userId'])
@Index(['name'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  name: string; // Human name like "Sarah", "Mike", etc.

  @Column({ type: 'text' })
  description: string; // e.g., "Facebook manager", "Instagram agent"

  @Column({ type: 'text', nullable: true })
  systemPrompt?: string; // AI system prompt generated from training

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.TRAINING
  })
  status: AgentStatus;

  @Column({ type: 'jsonb', nullable: true })
  trainingData?: {
    conversationCount: number;
    lastTrainingAt: Date;
    keyTopics: string[];
    communicationStyle: {
      tone: string; // formal, casual, friendly, professional
      language: string; // detected language
      avgMessageLength: number;
      commonPhrases: string[];
      emoticons: boolean;
    };
    preferences: {
      autoReply: boolean;
      responseDelay: number; // minutes
      businessHoursOnly: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    version: string;
    modelType: string;
    lastUpdated: Date;
    performanceMetrics: {
      responseAccuracy: number;
      userSatisfaction: number;
      trainingScore: number;
    };
  };

  @Column({ type: 'varchar', nullable: true })
  assignedAccountId?: string; // Which social media account this agent is assigned to

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.agents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Account, account => account.assignedAgents, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedAccountId' })
  assignedAccount?: Account;

  @OneToMany(() => TrainingSession, session => session.agent)
  trainingSessions: TrainingSession[];

  // Computed properties
  get isActive(): boolean {
    return this.status === AgentStatus.ACTIVE;
  }

  get isTraining(): boolean {
    return this.status === AgentStatus.TRAINING;
  }

  get hasSystemPrompt(): boolean {
    return !!this.systemPrompt && this.systemPrompt.length > 0;
  }

  get trainingProgress(): number {
    if (!this.trainingData?.conversationCount) return 0;
    // Consider agent ready after 10 meaningful conversations
    return Math.min(this.trainingData.conversationCount / 10, 1) * 100;
  }
} 