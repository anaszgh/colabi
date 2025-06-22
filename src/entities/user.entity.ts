import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { Account } from './account.entity';
import { Template } from './template.entity';

export enum UserRole {
  INFLUENCER = 'influencer',
  AGENCY = 'agency',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity('users')
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.INFLUENCER
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  company?: string;

  @Column({ type: 'varchar', nullable: true })
  website?: string;

  @Column({ type: 'varchar', nullable: true })
  bio?: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    autoReply: boolean;
    timezone: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  subscription?: {
    plan: string;
    status: string;
    expiresAt: Date;
    features: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Account, account => account.user)
  accounts: Account[];

  @OneToMany(() => Template, template => template.user)
  templates: Template[];

  // Computed properties
  get isInfluencer(): boolean {
    return this.role === UserRole.INFLUENCER;
  }

  get isAgency(): boolean {
    return this.role === UserRole.AGENCY;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}