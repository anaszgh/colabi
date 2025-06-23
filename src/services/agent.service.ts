import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Agent, AgentStatus } from '../entities/agent.entity';
import { Account } from '../entities/account.entity';
import { AzureAIService } from './azureAIService';

export interface CreateAgentData {
  name: string;
  description: string;
  userId: string;
  assignedAccountId?: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  status?: AgentStatus;
  assignedAccountId?: string;
  systemPrompt?: string;
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  trainingAgents: number;
  averageTrainingProgress: number;
  recentActivity: Array<{
    agentName: string;
    activity: string;
    timestamp: Date;
  }>;
}

export class AgentService {
  private agentRepository: Repository<Agent>;
  private accountRepository: Repository<Account>;
  private azureAIService: AzureAIService;

  constructor() {
    this.agentRepository = AppDataSource.getRepository(Agent);
    this.accountRepository = AppDataSource.getRepository(Account);
    this.azureAIService = new AzureAIService();
  }

  /**
   * Create a new AI agent
   */
  async createAgent(agentData: CreateAgentData): Promise<Agent> {
    // Verify the assigned account exists and belongs to the user
    if (agentData.assignedAccountId) {
      const account = await this.accountRepository.findOne({
        where: { 
          id: agentData.assignedAccountId,
          userId: agentData.userId 
        }
      });

      if (!account) {
        throw new Error('Assigned account not found or does not belong to user');
      }
    }

    // Create the agent
    const agent = this.agentRepository.create({
      ...agentData,
      status: AgentStatus.TRAINING,
      trainingData: {
        conversationCount: 0,
        lastTrainingAt: new Date(),
        keyTopics: [],
        communicationStyle: {
          tone: 'neutral',
          language: 'en',
          avgMessageLength: 0,
          commonPhrases: [],
          emoticons: false
        },
        preferences: {
          autoReply: false,
          responseDelay: 5,
          businessHoursOnly: false
        }
      },
      metadata: {
        version: '1.0.0',
        modelType: 'gpt-4o-mini',
        lastUpdated: new Date(),
        performanceMetrics: {
          responseAccuracy: 0,
          userSatisfaction: 0,
          trainingScore: 0
        }
      }
    });

    return await this.agentRepository.save(agent);
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string): Promise<any[]> {
    const agents = await this.agentRepository.find({
      where: { userId },
      relations: ['assignedAccount', 'trainingSessions'],
      order: { createdAt: 'DESC' }
    });

    // Transform agents to include calculated trainingProgress
    return agents.map(agent => ({
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      status: agent.status,
      trainingData: agent.trainingData,
      metadata: agent.metadata,
      assignedAccountId: agent.assignedAccountId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      assignedAccount: agent.assignedAccount,
      trainingSessions: agent.trainingSessions,
      // Calculated properties
      trainingProgress: agent.trainingProgress,
      isActive: agent.isActive,
      isTraining: agent.isTraining,
      hasSystemPrompt: agent.hasSystemPrompt
    }));
  }

  /**
   * Get a specific agent by ID
   */
  async getAgentById(id: string, userId: string): Promise<any | null> {
    const agent = await this.agentRepository.findOne({
      where: { id, userId },
      relations: ['assignedAccount', 'trainingSessions', 'user']
    });

    if (!agent) {
      return null;
    }

    // Transform agent to include calculated properties
    return {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      status: agent.status,
      trainingData: agent.trainingData,
      metadata: agent.metadata,
      assignedAccountId: agent.assignedAccountId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      assignedAccount: agent.assignedAccount,
      trainingSessions: agent.trainingSessions,
      user: agent.user,
      // Calculated properties
      trainingProgress: agent.trainingProgress,
      isActive: agent.isActive,
      isTraining: agent.isTraining,
      hasSystemPrompt: agent.hasSystemPrompt
    };
  }

  /**
   * Update an agent
   */
  async updateAgent(id: string, userId: string, updateData: UpdateAgentData): Promise<Agent> {
    const agent = await this.getAgentById(id, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // If updating assigned account, verify it belongs to the user
    if (updateData.assignedAccountId) {
      const account = await this.accountRepository.findOne({
        where: { 
          id: updateData.assignedAccountId,
          userId 
        }
      });

      if (!account) {
        throw new Error('Assigned account not found or does not belong to user');
      }
    }

    // Update the agent
    await this.agentRepository.update(id, {
      ...updateData,
      updatedAt: new Date()
    });

    const updatedAgent = await this.getAgentById(id, userId);
    if (!updatedAgent) {
      throw new Error('Failed to retrieve updated agent');
    }

    return updatedAgent;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: string, userId: string): Promise<void> {
    const agent = await this.getAgentById(id, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    await this.agentRepository.remove(agent);
  }

  /**
   * Generate system prompt for an agent based on training data
   */
  async generateSystemPrompt(agentId: string, userId: string, conversationHistory: string[]): Promise<string> {
    const agent = await this.getAgentById(agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Create a comprehensive prompt for the AI to analyze the conversation and generate a system prompt
    const analysisPrompt = `
You are tasked with creating a personalized system prompt for an AI agent named "${agent.name}" (${agent.description}).

Based on the following conversation history between the user and this agent during training, analyze:
1. Communication style and tone
2. Preferred language patterns  
3. Key topics and interests
4. Personality traits
5. Response preferences

Conversation History:
${conversationHistory.join('\n---\n')}

Create a comprehensive system prompt that will help this agent:
- Respond in the user's style and tone
- Handle messages appropriately for their social media context
- Maintain consistency with their personality
- Prioritize messages based on their preferences

The system prompt should be detailed but concise, focusing on actionable instructions for the AI agent.

Format the response as a single system prompt without additional commentary.
    `;

    try {
      const response = await this.azureAIService.askQuestion(analysisPrompt);
      
      // Update the agent with the new system prompt
      await this.updateAgent(agentId, userId, { 
        systemPrompt: response,
        status: AgentStatus.ACTIVE
      });

      return response;
    } catch (error) {
      console.error('Error generating system prompt:', error);
      throw new Error('Failed to generate system prompt');
    }
  }

  /**
   * Update training data for an agent
   */
  async updateTrainingData(agentId: string, userId: string, trainingUpdate: {
    conversationCount?: number;
    keyTopics?: string[];
    communicationStyle?: Partial<{
      tone: string;
      language: string;
      avgMessageLength: number;
      commonPhrases: string[];
      emoticons: boolean;
    }>;
    preferences?: Partial<{
      autoReply: boolean;
      responseDelay: number;
      businessHoursOnly: boolean;
    }>;
  }): Promise<Agent> {
    const agent = await this.getAgentById(agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const currentTrainingData = agent.trainingData || {
      conversationCount: 0,
      lastTrainingAt: new Date(),
      keyTopics: [],
      communicationStyle: {
        tone: 'neutral',
        language: 'en',
        avgMessageLength: 0,
        commonPhrases: [],
        emoticons: false
      },
      preferences: {
        autoReply: false,
        responseDelay: 5,
        businessHoursOnly: false
      }
    };

    const updatedTrainingData = {
      ...currentTrainingData,
      ...trainingUpdate,
      lastTrainingAt: new Date(),
      communicationStyle: {
        ...currentTrainingData.communicationStyle,
        ...(trainingUpdate.communicationStyle || {})
      },
      preferences: {
        ...currentTrainingData.preferences,
        ...(trainingUpdate.preferences || {})
      }
    };

    await this.agentRepository.update(agentId, {
      trainingData: updatedTrainingData
    });

    const updatedAgent = await this.getAgentById(agentId, userId);
    if (!updatedAgent) {
      throw new Error('Failed to retrieve updated agent');
    }

    return updatedAgent;
  }

  /**
   * Get agent analytics for a user
   */
  async getAgentAnalytics(userId: string): Promise<AgentAnalytics> {
    const agents = await this.getUserAgents(userId);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === AgentStatus.ACTIVE).length,
      trainingAgents: agents.filter(a => a.status === AgentStatus.TRAINING).length,
      averageTrainingProgress: agents.length > 0 
        ? agents.reduce((sum, a) => sum + a.trainingProgress, 0) / agents.length
        : 0,
      recentActivity: agents
        .filter(a => a.trainingData?.lastTrainingAt)
        .sort((a, b) => new Date(b.trainingData!.lastTrainingAt).getTime() - new Date(a.trainingData!.lastTrainingAt).getTime())
        .slice(0, 5)
        .map(a => ({
          agentName: a.name,
          activity: `Training session completed`,
          timestamp: new Date(a.trainingData!.lastTrainingAt)
        }))
    };
  }

  /**
   * Get agent by assigned account
   */
  async getAgentByAccount(accountId: string, userId: string): Promise<Agent | null> {
    return await this.agentRepository.findOne({
      where: { 
        assignedAccountId: accountId,
        userId 
      },
      relations: ['assignedAccount', 'user']
    });
  }

  /**
   * Assign agent to account
   */
  async assignToAccount(agentId: string, accountId: string, userId: string): Promise<Agent> {
    // Verify account belongs to user
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId }
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    // Update agent
    return await this.updateAgent(agentId, userId, { 
      assignedAccountId: accountId 
    });
  }

  /**
   * Unassign agent from account
   */
  async unassignFromAccount(agentId: string, userId: string): Promise<Agent> {
    return await this.updateAgent(agentId, userId, { 
      assignedAccountId: undefined 
    });
  }
} 