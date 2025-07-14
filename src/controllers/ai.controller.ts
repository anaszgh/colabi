import { Request, Response } from 'express';
import { AzureAIService } from "@/services/azure-ai.service";
import { UserService } from '@/services/user.service';

export class AIController{
    private aiService:AzureAIService;
    private userService:UserService;
    constructor(){
        this.aiService=new AzureAIService();
        this.userService=new UserService();
    }
    /**
     * handle incoming message with AI, analyze the message and provide a response.
     */
      ask = async (req: Request, res: Response): Promise<void> => {
        try {
          if (!req.user) {
            res.status(401).json({
              success: false,
              error: 'Not authenticated'
            });
            return;
          }
          
          const user = await this.userService.findById(req.user.id);
    
          if (!user) {
            res.status(404).json({
              success: false,
              error: 'User not found'
            });
            return;
          }
    
          // Remove password from response
          const { password: _, ...userResponse } = user;
    
          res.json({
            success: true,
            data: {
              user: userResponse
            }
          });
    
        } catch (error: any) {
          console.error('Get profile error:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
          });
        }
      };
    
}