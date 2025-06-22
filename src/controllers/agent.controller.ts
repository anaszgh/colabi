import { Request, Response } from 'express';
import { AgentService, CreateAgentData, UpdateAgentData } from '../services/agent.service';
import { TrainingService, CreateSessionData } from '../services/training.service';

// Type alias for authenticated requests
type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
};

export class AgentController {
  private agentService: AgentService;
  private trainingService: TrainingService;

  constructor() {
    this.agentService = new AgentService();
    this.trainingService = new TrainingService();
  }

  /**
   * Get all agents for the authenticated user
   */
  async getUserAgents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const agents = await this.agentService.getUserAgents(userId);
      
      res.json({
        success: true,
        data: agents
      });
    } catch (error: any) {
      console.error('Error fetching user agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message
      });
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const agent = await this.agentService.getAgentById(id, userId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
        return;
      }

      res.json({
        success: true,
        data: agent
      });
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent',
        error: error.message
      });
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, description, assignedAccountId } = req.body;

      if (!name || !description) {
        res.status(400).json({
          success: false,
          message: 'Name and description are required'
        });
        return;
      }

      const agentData: CreateAgentData = {
        name: name.trim(),
        description: description.trim(),
        userId,
        assignedAccountId
      };

      const agent = await this.agentService.createAgent(agentData);

      res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: agent
      });
    } catch (error: any) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create agent',
        error: error.message
      });
    }
  }

  /**
   * Update an agent
   */
  async updateAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData: UpdateAgentData = req.body;

      const agent = await this.agentService.updateAgent(id, userId, updateData);

      res.json({
        success: true,
        message: 'Agent updated successfully',
        data: agent
      });
    } catch (error: any) {
      console.error('Error updating agent:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: 'Failed to update agent',
        error: error.message
      });
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.agentService.deleteAgent(id, userId);

      res.json({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: 'Failed to delete agent',
        error: error.message
      });
    }
  }

  /**
   * Get agent analytics
   */
  async getAgentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const analytics = await this.agentService.getAgentAnalytics(userId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error fetching agent analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  /**
   * Assign agent to account
   */
  async assignToAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { accountId } = req.body;
      const userId = req.user!.id;

      if (!accountId) {
        res.status(400).json({
          success: false,
          message: 'Account ID is required'
        });
        return;
      }

      const agent = await this.agentService.assignToAccount(id, accountId, userId);

      res.json({
        success: true,
        message: 'Agent assigned to account successfully',
        data: agent
      });
    } catch (error: any) {
      console.error('Error assigning agent to account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign agent to account',
        error: error.message
      });
    }
  }

  /**
   * Unassign agent from account
   */
  async unassignFromAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const agent = await this.agentService.unassignFromAccount(id, userId);

      res.json({
        success: true,
        message: 'Agent unassigned from account successfully',
        data: agent
      });
    } catch (error: any) {
      console.error('Error unassigning agent from account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unassign agent from account',
        error: error.message
      });
    }
  }

  /**
   * Start a new training session for an agent
   */
  async startTrainingSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { title } = req.body;

      const sessionData: CreateSessionData = {
        agentId: id,
        title
      };

      const session = await this.trainingService.createSession(sessionData, userId);

      res.status(201).json({
        success: true,
        message: 'Training session started successfully',
        data: session
      });
    } catch (error: any) {
      console.error('Error starting training session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start training session',
        error: error.message
      });
    }
  }

  /**
   * Get training sessions for an agent
   */
  async getTrainingSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const sessions = await this.trainingService.getAgentTrainingSessions(id, userId);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error: any) {
      console.error('Error fetching training sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training sessions',
        error: error.message
      });
    }
  }

  /**
   * Get a specific training session
   */
  async getTrainingSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      const session = await this.trainingService.getSession(sessionId, userId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Training session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error: any) {
      console.error('Error fetching training session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training session',
        error: error.message
      });
    }
  }

  /**
   * Send a message in a training session
   */
  async sendTrainingMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      if (!content || !content.trim()) {
        res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
        return;
      }

      // Add user message
      const userMessage = await this.trainingService.addUserMessage(sessionId, content.trim(), userId);

      // Generate agent response
      const agentResponse = await this.trainingService.generateAgentResponse(sessionId, userId);

      res.json({
        success: true,
        message: 'Messages sent successfully',
        data: {
          userMessage,
          agentResponse
        }
      });
    } catch (error: any) {
      console.error('Error sending training message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  }

  /**
   * Complete a training session
   */
  async completeTrainingSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      const session = await this.trainingService.completeSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Training session completed successfully',
        data: session
      });
    } catch (error: any) {
      console.error('Error completing training session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete training session',
        error: error.message
      });
    }
  }

  /**
   * Delete a training session
   */
  async deleteTrainingSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      await this.trainingService.deleteSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Training session deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting training session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete training session',
        error: error.message
      });
    }
  }

  /**
   * Generate system prompt for an agent
   */
  async generateSystemPrompt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { conversationHistory = [] } = req.body;

      const systemPrompt = await this.agentService.generateSystemPrompt(id, userId, conversationHistory);

      res.json({
        success: true,
        message: 'System prompt generated successfully',
        data: { systemPrompt }
      });
    } catch (error: any) {
      console.error('Error generating system prompt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate system prompt',
        error: error.message
      });
    }
  }

  /**
   * Get recent training activity
   */
  async getTrainingActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const activity = await this.trainingService.getRecentTrainingActivity(userId, limit);

      res.json({
        success: true,
        data: activity
      });
    } catch (error: any) {
      console.error('Error fetching training activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training activity',
        error: error.message
      });
    }
  }
} 