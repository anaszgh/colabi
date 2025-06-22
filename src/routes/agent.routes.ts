import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const agentController = new AgentController();

// Apply authentication to all agent routes
router.use(authenticateToken);

// Agent Management Routes
router.get('/', (req, res) => agentController.getUserAgents(req as any, res));
router.post('/', (req, res) => agentController.createAgent(req as any, res));
router.get('/analytics', (req, res) => agentController.getAgentAnalytics(req as any, res));
router.get('/training/activity', (req, res) => agentController.getTrainingActivity(req as any, res));

router.get('/:id', (req, res) => agentController.getAgent(req as any, res));
router.put('/:id', (req, res) => agentController.updateAgent(req as any, res));
router.delete('/:id', (req, res) => agentController.deleteAgent(req as any, res));

// Agent Assignment Routes
router.post('/:id/assign', (req, res) => agentController.assignToAccount(req as any, res));
router.post('/:id/unassign', (req, res) => agentController.unassignFromAccount(req as any, res));

// System Prompt Generation
router.post('/:id/generate-prompt', (req, res) => agentController.generateSystemPrompt(req as any, res));

// Training Session Routes
router.get('/:id/training-sessions', (req, res) => agentController.getTrainingSessions(req as any, res));
router.post('/:id/training-sessions', (req, res) => agentController.startTrainingSession(req as any, res));

// Individual Training Session Routes
router.get('/training-sessions/:sessionId', (req, res) => agentController.getTrainingSession(req as any, res));
router.post('/training-sessions/:sessionId/messages', (req, res) => agentController.sendTrainingMessage(req as any, res));
router.post('/training-sessions/:sessionId/complete', (req, res) => agentController.completeTrainingSession(req as any, res));
router.delete('/training-sessions/:sessionId', (req, res) => agentController.deleteTrainingSession(req as any, res));

export default router; 