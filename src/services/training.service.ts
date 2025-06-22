import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TrainingSession, SessionStatus, MessageRole } from '../entities/training-session.entity';
import { Agent } from '../entities/agent.entity';
import { AzureAIService } from './azureAIService';
import { AgentService } from './agent.service';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    responseTime?: number;
    confidence?: number;
  };
}

export interface CreateSessionData {
  agentId: string;
  title?: string;
}

export interface SessionAnalysis {
  totalMessages: number;
  userMessages: number;
  agentMessages: number;
  avgResponseTime: number;
  keyInsights: string[];
  communicationPatterns: {
    tone: string;
    formality: string;
    topics: string[];
    emotionalTone: string;
  };
  improvementSuggestions: string[];
}

export class TrainingService {
  private trainingSessionRepository: Repository<TrainingSession>;
  private agentRepository: Repository<Agent>;
  private azureAIService: AzureAIService;
  private agentService: AgentService;

  constructor() {
    this.trainingSessionRepository = AppDataSource.getRepository(TrainingSession);
    this.agentRepository = AppDataSource.getRepository(Agent);
    this.azureAIService = new AzureAIService();
    this.agentService = new AgentService();
  }

  /**
   * Create a new training session
   */
  async createSession(sessionData: CreateSessionData, userId: string): Promise<TrainingSession> {
    // Verify the agent exists and belongs to the user
    const agent = await this.agentService.getAgentById(sessionData.agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Create initial training session
    const session = this.trainingSessionRepository.create({
      agentId: sessionData.agentId,
      title: sessionData.title || `Training Session ${new Date().toLocaleDateString()}`,
      status: SessionStatus.ACTIVE,
      messages: [],
      lastMessageAt: new Date()
    });

    return await this.trainingSessionRepository.save(session);
  }

  /**
   * Get all training sessions for an agent
   */
  async getAgentTrainingSessions(agentId: string, userId: string): Promise<TrainingSession[]> {
    // Verify agent belongs to user
    const agent = await this.agentService.getAgentById(agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    return await this.trainingSessionRepository.find({
      where: { agentId },
      relations: ['agent'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get a specific training session
   */
  async getSession(sessionId: string, userId: string): Promise<TrainingSession | null> {
    const session = await this.trainingSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['agent']
    });

    if (!session) {
      return null;
    }

    // Verify the session's agent belongs to the user
    const agent = await this.agentService.getAgentById(session.agentId, userId);
    if (!agent) {
      throw new Error('Unauthorized access to training session');
    }

    return session;
  }

  /**
   * Add a user message to the training session
   */
  async addUserMessage(sessionId: string, content: string, userId: string): Promise<ChatMessage> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Training session not found');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error('Cannot add messages to inactive training session');
    }

    const message: ChatMessage = {
      id: uuidv4(),
      role: MessageRole.USER,
      content,
      timestamp: new Date()
    };

    // Add message to session
    const updatedMessages = [...(session.messages || []), message];
    
    await this.trainingSessionRepository.update(sessionId, {
      messages: updatedMessages,
      lastMessageAt: new Date()
    });

    return message;
  }

  /**
   * Generate and add an agent response to the training session
   */
  async generateAgentResponse(sessionId: string, userId: string): Promise<ChatMessage> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Training session not found');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error('Cannot generate responses for inactive training session');
    }

    const agent = await this.agentService.getAgentById(session.agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    try {
      const startTime = Date.now();

      // Create context from conversation history
      const conversationContext = (session.messages || [])
        .slice(-10) // Use last 10 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Create training prompt
      const trainingPrompt = `
You are an AI agent in training named "${agent.name}" (${agent.description}). 
You are learning how to communicate like the user to eventually handle their social media messages.

Your goal during training is to:
1. Ask relevant questions to understand the user's communication style
2. Learn about their personality, tone, and preferences
3. Understand how they would respond to different types of messages
4. Ask for examples of how they would handle specific scenarios

Current conversation:
${conversationContext}

Respond as the AI agent being trained. Ask thoughtful questions to better understand how the user communicates and handles different situations.
      `;

      const response = await this.azureAIService.askQuestion(trainingPrompt, agent.systemPrompt);
      const responseTime = Date.now() - startTime;

      const agentMessage: ChatMessage = {
        id: uuidv4(),
        role: MessageRole.AGENT,
        content: response,
        timestamp: new Date(),
        metadata: {
          responseTime: responseTime,
          tokens: response.length // Approximate token count
        }
      };

      // Add agent response to session
      const updatedMessages = [...(session.messages || []), agentMessage];
      
      await this.trainingSessionRepository.update(sessionId, {
        messages: updatedMessages,
        lastMessageAt: new Date()
      });

      return agentMessage;
    } catch (error) {
      console.error('Error generating agent response:', error);
      throw new Error('Failed to generate agent response');
    }
  }

  /**
   * Complete a training session and analyze the conversation
   */
  async completeSession(sessionId: string, userId: string): Promise<TrainingSession> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Training session not found');
    }

    // Analyze the conversation
    const analysis = await this.analyzeSession(session);

    // Update session status and analysis
    await this.trainingSessionRepository.update(sessionId, {
      status: SessionStatus.COMPLETED,
      analysis,
      completedAt: new Date()
    });

    // Update agent training data
    await this.updateAgentFromSession(session.agentId, userId, session, analysis);

    const updatedSession = await this.getSession(sessionId, userId);
    return updatedSession!;
  }

  /**
   * Analyze a training session to extract insights
   */
  private async analyzeSession(session: TrainingSession): Promise<SessionAnalysis> {
    const messages = session.messages || [];
    const userMessages = messages.filter(m => m.role === MessageRole.USER);
    const agentMessages = messages.filter(m => m.role === MessageRole.AGENT);

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    agentMessages.forEach(msg => {
      if (msg.metadata?.responseTime) {
        totalResponseTime += msg.metadata.responseTime;
        responseCount++;
      }
    });

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Create conversation analysis prompt
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const analysisPrompt = `
Analyze this training conversation between a user and an AI agent. Extract key insights about:

1. Communication style and tone
2. Topics discussed
3. User preferences and patterns
4. Emotional tone
5. Areas for improvement

Conversation:
${conversationText}

Provide analysis in JSON format:
{
  "keyInsights": ["insight1", "insight2", ...],
  "communicationPatterns": {
    "tone": "formal/casual/friendly/professional",
    "formality": "high/medium/low", 
    "topics": ["topic1", "topic2", ...],
    "emotionalTone": "positive/neutral/negative"
  },
  "improvementSuggestions": ["suggestion1", "suggestion2", ...]
}
    `;

    try {
      const analysisResponse = await this.azureAIService.askQuestion(analysisPrompt);
      const parsedAnalysis = JSON.parse(analysisResponse);

      return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        agentMessages: agentMessages.length,
        avgResponseTime: Math.round(avgResponseTime),
        keyInsights: parsedAnalysis.keyInsights || [],
        communicationPatterns: parsedAnalysis.communicationPatterns || {
          tone: 'neutral',
          formality: 'medium',
          topics: [],
          emotionalTone: 'neutral'
        },
        improvementSuggestions: parsedAnalysis.improvementSuggestions || []
      };
    } catch (error) {
      console.error('Error analyzing session:', error);
      // Return basic analysis if AI analysis fails
      return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        agentMessages: agentMessages.length,
        avgResponseTime: Math.round(avgResponseTime),
        keyInsights: ['Training session completed'],
        communicationPatterns: {
          tone: 'neutral',
          formality: 'medium',
          topics: [],
          emotionalTone: 'neutral'
        },
        improvementSuggestions: ['Continue training to improve responses']
      };
    }
  }

  /**
   * Update agent training data based on completed session
   */
  private async updateAgentFromSession(
    agentId: string, 
    userId: string, 
    session: TrainingSession, 
    analysis: SessionAnalysis
  ): Promise<void> {
    const agent = await this.agentService.getAgentById(agentId, userId);
    if (!agent) {
      return;
    }

    const currentCount = agent.trainingData?.conversationCount || 0;
    const newCount = currentCount + 1;

    // Extract topics from analysis
    const topics = analysis.communicationPatterns.topics || [];
    const existingTopics = agent.trainingData?.keyTopics || [];
    const updatedTopics = [...new Set([...existingTopics, ...topics])].slice(0, 20); // Keep top 20 topics

    // Calculate average message length
    const userMessages = session.messages?.filter(m => m.role === MessageRole.USER) || [];
    const avgLength = userMessages.length > 0 
      ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
      : 0;

    // Update agent training data
    await this.agentService.updateTrainingData(agentId, userId, {
      conversationCount: newCount,
      keyTopics: updatedTopics,
      communicationStyle: {
        tone: analysis.communicationPatterns.tone,
        language: 'en', // Default to English for now
        avgMessageLength: Math.round(avgLength),
        commonPhrases: [], // Could be extracted from analysis
        emoticons: userMessages.some(msg => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(msg.content))
      }
    });

    // Generate new system prompt if agent has enough training
    if (newCount >= 3 && newCount % 5 === 0) { // Every 5 sessions after 3 minimum
      const conversationHistory = (session.messages || [])
        .map(msg => `${msg.role}: ${msg.content}`);
      
      try {
        await this.agentService.generateSystemPrompt(agentId, userId, conversationHistory);
      } catch (error) {
        console.error('Error updating system prompt:', error);
      }
    }
  }

  /**
   * Delete a training session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Training session not found');
    }

    await this.trainingSessionRepository.remove(session);
  }

  /**
   * Get recent training activity for user
   */
  async getRecentTrainingActivity(userId: string, limit: number = 10): Promise<Array<{
    sessionId: string;
    agentName: string;
    activity: string;
    timestamp: Date;
  }>> {
    // Get user's agents
    const agents = await this.agentService.getUserAgents(userId);
    const agentIds = agents.map(a => a.id);

    if (agentIds.length === 0) {
      return [];
    }

    // Get recent training sessions
    const recentSessions = await this.trainingSessionRepository.find({
      where: { agentId: { $in: agentIds } as any },
      relations: ['agent'],
      order: { updatedAt: 'DESC' },
      take: limit
    });

    return recentSessions.map(session => ({
      sessionId: session.id,
      agentName: session.agent?.name || 'Unknown Agent',
      activity: session.status === SessionStatus.COMPLETED 
        ? 'Training session completed'
        : 'Training session active',
      timestamp: session.updatedAt
    }));
  }
} 