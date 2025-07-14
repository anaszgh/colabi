import request from 'supertest';
import app from '../server';

// Mock the Azure AI Service to avoid actual API calls during tests
jest.mock('../services/azure-ai.service', () => {
  return {
    AzureAIService: jest.fn().mockImplementation(() => ({
      askQuestion: jest.fn().mockResolvedValue('Mocked AI response'),
      getDeployments: jest.fn().mockResolvedValue([
        { name: 'test-deployment', modelName: 'gpt-4', modelPublisher: 'OpenAI' }
      ]),
      streamResponse: jest.fn().mockImplementation(async function* () {
        yield 'Mocked ';
        yield 'stream ';
        yield 'response';
      }),
      testConnection: jest.fn().mockResolvedValue(true)
    }))
  };
});

describe('Express Server', () => {
  describe('Original Routes', () => {
    describe('GET /', () => {
      it('should return welcome message', async () => {
        const response = await request(app)
          .get('/')
          .expect(200);
        
        expect(response.body).toEqual({
          message: 'Hello World! Express server is running.'
        });
      });
    });

    describe('GET /health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);
        
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });
    });

    describe('POST /echo', () => {
      it('should echo back the request body', async () => {
        const testData = { name: 'John', age: 30 };
        
        const response = await request(app)
          .post('/echo')
          .send(testData)
          .expect(200);
        
        expect(response.body).toEqual({
          echo: testData
        });
      });

      it('should handle empty request body', async () => {
        const response = await request(app)
          .post('/echo')
          .send({})
          .expect(200);
        
        expect(response.body).toEqual({
          echo: {}
        });
      });
    });

    describe('404 handling', () => {
      it('should return 404 for non-existent routes', async () => {
        const response = await request(app)
          .get('/nonexistent')
          .expect(404);
        
        expect(response.body).toEqual({
          error: 'Route not found'
        });
      });
    });

    describe('Content-Type handling', () => {
      it('should handle JSON content type', async () => {
        const testData = { message: 'test' };
        
        const response = await request(app)
          .post('/echo')
          .set('Content-Type', 'application/json')
          .send(testData)
          .expect(200);
        
        expect(response.body.echo).toEqual(testData);
      });

      it('should handle URL-encoded content type', async () => {
        const response = await request(app)
          .post('/echo')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('name=John&age=30')
          .expect(200);
        
        expect(response.body.echo).toEqual({
          name: 'John',
          age: '30'
        });
      });
    });
  });

  describe('Azure AI Routes', () => {
    beforeEach(() => {
      // Set environment variables for tests
      process.env.DEFAULT_DEPLOYMENT_NAME = 'test-deployment';
    });

    describe('POST /ai/ask', () => {
      it('should process AI question successfully', async () => {
        const testQuestion = { question: 'What is AI?' };
        
        const response = await request(app)
          .post('/ai/ask')
          .send(testQuestion)
          .expect(200);
        
        expect(response.body).toHaveProperty('question', 'What is AI?');
        expect(response.body).toHaveProperty('response', 'Mocked AI response');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should return 400 if question is missing', async () => {
        const response = await request(app)
          .post('/ai/ask')
          .send({})
          .expect(400);
        
        expect(response.body).toEqual({
          error: 'Question is required'
        });
      });

      it('should handle system prompt', async () => {
        const testData = { 
          question: 'What is AI?', 
          systemPrompt: 'You are a helpful assistant' 
        };
        
        const response = await request(app)
          .post('/ai/ask')
          .send(testData)
          .expect(200);
        
        expect(response.body).toHaveProperty('response', 'Mocked AI response');
      });

      it('should handle custom deployment name', async () => {
        const testData = { 
          question: 'What is AI?', 
          deploymentName: 'custom-deployment' 
        };
        
        const response = await request(app)
          .post('/ai/ask')
          .send(testData)
          .expect(200);
        
        expect(response.body).toHaveProperty('response', 'Mocked AI response');
      });
    });

    describe('GET /ai/deployments', () => {
      it('should return available deployments', async () => {
        const response = await request(app)
          .get('/ai/deployments')
          .expect(200);
        
        expect(response.body).toHaveProperty('deployments');
        expect(Array.isArray(response.body.deployments)).toBe(true);
        expect(response.body.deployments[0]).toHaveProperty('name', 'test-deployment');
      });
    });

    describe('POST /ai/stream', () => {
      it('should stream AI response', async () => {
        const testData = { question: 'Tell me a story' };
        
        const response = await request(app)
          .post('/ai/stream')
          .send(testData)
          .expect(200);
        
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.text).toContain('Mocked stream response');
      });

      it('should return 400 if question is missing for stream', async () => {
        const response = await request(app)
          .post('/ai/stream')
          .send({})
          .expect(400);
        
        expect(response.body).toEqual({
          error: 'Question is required'
        });
      });
    });
  });
});