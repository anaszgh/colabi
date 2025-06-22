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
import { Agent } from './agent.entity';

export enum MessageRole {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

@Entity('training_sessions')
@Index(['agentId'])
@Index(['createdAt'])
export class TrainingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agentId: string;

  @Column({ type: 'varchar', nullable: true })
  title?: string; // Optional session title

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE
  })
  status: SessionStatus;

  @Column({ type: 'jsonb' })
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    metadata?: {
      tokens?: number;
      responseTime?: number;
      confidence?: number;
    };
  }>;

  @Column({ type: 'jsonb', nullable: true })
  analysis?: {
    totalMessages: number;
    userMessages: number;
    agentMessages: number;
    avgResponseTime: number;
    sessionDuration: number; // in minutes
    keyInsights: string[];
    communicationPatterns: {
      tone: string;
      formality: string;
      topics: string[];
      emotionalTone: string;
    };
    improvementSuggestions: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Agent, agent => agent.trainingSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  // Computed properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  get messageCount(): number {
    return this.messages?.length || 0;
  }

  get lastUserMessage(): string | null {
    const userMessages = this.messages?.filter(m => m.role === MessageRole.USER);
    return userMessages?.length > 0 ? userMessages[userMessages.length - 1].content : null;
  }

  get lastAgentMessage(): string | null {
    const agentMessages = this.messages?.filter(m => m.role === MessageRole.AGENT);
    return agentMessages?.length > 0 ? agentMessages[agentMessages.length - 1].content : null;
  }

  get sessionDuration(): number {
    if (!this.lastMessageAt) return 0;
    return Math.round((this.lastMessageAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }
} 