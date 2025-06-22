import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { AzureAIService } from './services/azureAIService';
import { connectDatabase, disconnectDatabase } from './config/database';
import { messageSyncService } from './services/messageSync.service';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import accountRoutes from './routes/account.routes';
import oauthRoutes from './routes/oauth.routes';
import linkedinRoutes from './routes/linkedin.routes';
import instagramRoutes from './routes/instagram.routes';
import agentRoutes from './routes/agent.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Azure AI Service
const azureAIService = new AzureAIService();

// Set up EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// API Routes - Mount before UI routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/agents', agentRoutes);
app.use('/auth', oauthRoutes);
app.use('/user', dashboardRoutes);
app.use('/linkedin', linkedinRoutes);
app.use('/instagram', instagramRoutes);

// UI Routes
app.get('/', (req: Request, res: Response) => {
  res.render('home', { 
    title: 'Colabi - AI-Powered Influencer Management Platform' 
  });
});

app.get('/login', (req: Request, res: Response) => {
  res.render('auth', { 
    title: 'Login to Colabi',
    mode: 'login'
  });
});

app.get('/register', (req: Request, res: Response) => {
  res.render('auth', { 
    title: 'Join Colabi',
    mode: 'register'
  });
});

app.get('/dashboard', (req: Request, res: Response) => {
  // In a real app, you'd want to verify authentication here
  // For now, we'll keep the mock data structure
  const dashboardData = {
    metrics: [
      { label: 'Messages Analyzed', value: '847K' },
      { label: 'Connected Accounts', value: '2,341' },
      { label: 'Business Opportunities', value: '1,247' },
      { label: 'AI Response Rate', value: '98.7%' },
      { label: 'Active Influencers', value: '532' },
      { label: 'Avg Response Time', value: '1.2s' },
      { label: 'Platform Integrations', value: '6' },
      { label: 'Messages This Month', value: '156K' }
    ]
  };
  
  res.render('dashboard', { 
    title: 'Dashboard - Colabi',
    user: { name: 'Anas Aref', email: 'anas.zgh@gmail.com' }, // This should come from session/JWT
    ...dashboardData
  });
});

app.get('/accounts', (req: Request, res: Response) => {
  // In a real app, you'd want to verify authentication here
  res.render('accounts', { 
    title: 'Connected Accounts - Colabi',
    user: { name: 'Anas Aref', email: 'anas.zgh@gmail.com' } // This should come from session/JWT
  });
});

app.get('/train-agent', (req: Request, res: Response) => {
  // In a real app, you'd want to verify authentication here
  res.render('train-agent', { 
    title: 'Train your Agent - Colabi',
    user: { name: 'Anas Aref', email: 'anas.zgh@gmail.com' } // This should come from session/JWT
  });
});

// Legacy auth endpoints for frontend compatibility - proxy to API routes
app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    // Forward to the actual API route
    const response = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data:any = await response.json();
    
    if (data.success) {
      // Set session/cookie if needed
      res.json({ success: true, redirect: '/dashboard' });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Login proxy error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.post('/auth/register', async (req: Request, res: Response) => {
  try {
    // Forward to the actual API route
    const response = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data:any = await response.json();
    
    if (data.success) {
      // Set session/cookie if needed
      res.json({ success: true, redirect: '/dashboard' });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('Registration proxy error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    // Forward to the actual API route
    const response = await fetch(`http://localhost:${PORT}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();
    res.json({ success: true, redirect: '/login' });
  } catch (error) {
    console.error('Logout proxy error:', error);
    res.json({ success: true, redirect: '/login' }); // Always succeed logout on frontend
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/echo', (req: Request, res: Response) => {
  res.json({ echo: req.body });
});

// Azure AI routes
app.post('/ai/ask', async (req: Request, res: Response) => {
  try {
    const { question, systemPrompt } = req.body;
    
    if (!question) {
      res.status(400).json({ 
        error: "Question is required" 
      });
      return;
    }

    const response = await azureAIService.askQuestion(
      question, 
      systemPrompt
    );
    
    res.json({ 
      question,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error processing AI request:", error);
    res.status(500).json({ 
      error: "Failed to process AI request",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/ai/stream', async (req: Request, res: Response) => {
  try {
    const { question, deploymentName, systemPrompt } = req.body;
    
    if (!question) {
      res.status(400).json({ error: "Question is required" });
      return;
    }
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await azureAIService.streamResponse(
      question,
      systemPrompt
    );
    
    for await (const chunk of stream) {
      res.write(chunk);
    }
    
    res.end();
  } catch (error: any) {
    console.error("Error streaming response:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Stream error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down...');
  try {
    messageSyncService.stop();
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🔄 Gracefully shutting down...');
  try {
    messageSyncService.stop();
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    try {
      await connectDatabase();
      
      // Start message sync service (5 minute intervals)
      messageSyncService.start(5);
      
      app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
        console.log(`🔐 Login: http://localhost:${PORT}/login`);
        console.log(`✨ Register: http://localhost:${PORT}/register`);
        console.log(`🔄 Message sync service started`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

export default app;