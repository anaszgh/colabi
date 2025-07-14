import { AIProjectClient } from '@azure/ai-projects';
import { AzureKeyCredential } from '@azure/core-auth';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureOpenAI } from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelDeployment {
  name: string;
  modelName?: string;
  modelPublisher?: string;
  modelVersion?: string;
}

export class AzureAIService {
  private projectClient: AIProjectClient;
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.AZURE_AI_PROJECT_ENDPOINT!;
    const apiKey = process.env.AZURE_AI_API_KEY;

    this.projectClient = new AIProjectClient(this.endpoint    , new DefaultAzureCredential());
   
  }

  /**
   * Ask a question using Azure OpenAI through AI Foundry
   */
  async askQuestion(
    question: string, 
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Get authenticated Azure OpenAI client through AI Foundry
      const openAIClient = await this.projectClient.inference.azureOpenAI({
        apiVersion: "2024-10-21"
      });

      const messages: ChatMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user', content: question }
      ];

      const deployment = 'gpt-4o-mini'
      if (!deployment) {
        throw new Error('Deployment name is required. Set DEFAULT_DEPLOYMENT_NAME or provide deploymentName parameter.');
      }

      const response = await openAIClient.chat.completions.create({
        model: deployment,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || "No response generated";
    } catch (error: any) {
      console.error("Error calling Azure OpenAI through AI Foundry:", error);
      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  /**
   * Stream responses from Azure OpenAI
   */
  async streamResponse(
    question: string,
    deploymentName?: string,
    systemPrompt?: string
  ): Promise<AsyncIterable<string>> {
    try {
      const openAIClient = await this.projectClient.inference.azureOpenAI({
        apiVersion: "2024-10-21"
      });

      const messages: ChatMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user', content: question }
      ];

      const deployment = deploymentName || process.env.DEFAULT_DEPLOYMENT_NAME;
      if (!deployment) {
        throw new Error('Deployment name is required. Set DEFAULT_DEPLOYMENT_NAME or provide deploymentName parameter.');
      }

      const stream = await openAIClient.chat.completions.create({
        model: deployment,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true
      });

      return this.parseOpenAIStream(stream);
    } catch (error: any) {
      console.error("Error streaming response:", error);
      throw new Error(`AI stream failed: ${error.message}`);
    }
  }


  private async* parseOpenAIStream(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      console.error("Error parsing stream:", error);
      throw error;
    }
  }
}