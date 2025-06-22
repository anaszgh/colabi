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
import { User } from './user.entity';
import { MessageCategory } from './message.entity';

export enum TemplateType {
  AUTO_REPLY = 'auto_reply',
  QUICK_RESPONSE = 'quick_response',
  BUSINESS_INQUIRY = 'business_inquiry',
  FAN_INTERACTION = 'fan_interaction',
  COLLABORATION = 'collaboration'
}

@Entity('templates')
@Index(['userId', 'category'])
@Index(['type', 'isActive'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TemplateType
  })
  type: TemplateType;

  @Column({
    type: 'enum',
    enum: MessageCategory,
    nullable: true
  })
  category?: MessageCategory;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  triggers?: string[]; // Keywords that trigger this template

  @Column({ type: 'simple-array', nullable: true })
  variables?: string[]; // Variables that can be replaced in the template

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean; // System default template

  @Column({ type: 'simple-array', nullable: true })
  platforms?: string[]; // Which platforms this template can be used on

  @Column({ type: 'jsonb', nullable: true })
  conditions?: {
    minimumFollowers?: number;
    maximumFollowers?: number;
    timeOfDay?: string;
    dayOfWeek?: string[];
    sentimentRequired?: 'positive' | 'negative' | 'neutral';
  };

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  successRate: number; // Percentage of successful responses

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.templates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Methods
  processTemplate(variables: Record<string, string> = {}): string {
    let processedContent = this.content;
    
    // Replace variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    return processedContent;
  }

  matchesTriggers(messageContent: string): boolean {
    if (!this.triggers || this.triggers.length === 0) {
      return false;
    }

    const lowerContent = messageContent.toLowerCase();
    return this.triggers.some(trigger => 
      lowerContent.includes(trigger.toLowerCase())
    );
  }

  // Computed properties
  get isAutoReply(): boolean {
    return this.type === TemplateType.AUTO_REPLY;
  }

  get hasConditions(): boolean {
    return !!this.conditions && Object.keys(this.conditions).length > 0;
  }
}