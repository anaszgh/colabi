import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Account } from '../entities/account.entity';
import { Message } from '../entities/message.entity';
import { Template } from '../entities/template.entity';
import { Agent } from '../entities/agent.entity';
import { TrainingSession } from '../entities/training-session.entity';

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Account, Message, Template, Agent, TrainingSession],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.DB_HOST?.includes('azure.com') || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  extra: {
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
    statement_timeout: 30000,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
};