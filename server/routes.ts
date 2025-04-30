import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse } from "./openai";
import { canUseOpenAI, canUseQwen } from "./fallbackChat";
import { getPersonalityConfig } from "./personalities";
import { 
  messageSchema, 
  conversationSchema, 
  insertMessageSchema, 
  insertConversationSchema,
  messageRoleSchema,
  personalityTypeSchema
} from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

// Track the current model in use
let currentModelStatus = {
  model: 'openai',
  isOpenAIAvailable: true,
  isQwenAvailable: true,
  lastChecked: new Date()
};

// Function to check and update model availability status
async function updateModelStatus() {
  try {
    const isOpenAIAvailable = await canUseOpenAI();
    const isQwenAvailable = await canUseQwen();
    
    // Determine current model based on availability
    let model = 'unavailable';
    if (isOpenAIAvailable) {
      model = 'openai';
    } else if (isQwenAvailable) {
      model = 'qwen';
    }
    
    currentModelStatus = {
      model,
      isOpenAIAvailable,
      isQwenAvailable,
      lastChecked: new Date()
    };
    
    console.log(`Updated model status: ${model} (OpenAI: ${isOpenAIAvailable}, Qwen: ${isQwenAvailable})`);
    return currentModelStatus;
  } catch (error) {
    console.error("Error updating model status:", error);
    return currentModelStatus;
  }
}

// Initialize model status
updateModelStatus();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations." });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversationId = nanoid();
      const result = insertConversationSchema.safeParse({
        id: conversationId,
        title: req.body.title || "New Conversation"
      });

      if (!result.success) {
        return res.status(400).json({ message: "Invalid conversation data." });
      }

      const conversation = await storage.createConversation(result.data);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation." });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
      }
      
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages." });
    }
  });

  // Send a message and get AI response
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // Update model status before processing
      await updateModelStatus();
      
      // Check if any AI model is available
      if (currentModelStatus.model === 'unavailable') {
        return res.status(503).json({ 
          message: "All AI models are currently unavailable. Please check your API keys." 
        });
      }
      
      // Validate incoming data
      const result = conversationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid chat data format." });
      }

      const { messages } = result.data;
      const conversationId = req.body.conversationId || "default";
      
      // Ensure the conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation && conversationId !== "default") {
        return res.status(404).json({ message: "Conversation not found." });
      }

      // Store user message
      const userMessage = messages[messages.length - 1];
      if (userMessage.role !== "user") {
        return res.status(400).json({ message: "Last message must be from the user." });
      }

      await storage.createMessage({
        content: userMessage.content,
        role: userMessage.role,
        conversationId
      });

      // Generate AI response
      const aiResponse = await generateChatResponse(messages);

      // Store AI response
      const savedMessage = await storage.createMessage({
        content: aiResponse,
        role: "assistant",
        conversationId
      });

      // Return the AI response with model info
      res.json({ 
        message: savedMessage,
        conversationId,
        modelInfo: {
          model: currentModelStatus.model,
          isFallback: currentModelStatus.model !== 'openai'
        }
      });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to process chat message." 
      });
    }
  });
  
  // Get current model status
  app.get("/api/model-status", async (_req: Request, res: Response) => {
    try {
      // If it's been more than 5 minutes since last check, update status
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (currentModelStatus.lastChecked < fiveMinutesAgo) {
        await updateModelStatus();
      }
      
      return res.json(currentModelStatus);
    } catch (error) {
      console.error("Error getting model status:", error);
      return res.status(500).json({ message: "Failed to get model status" });
    }
  });

  // Update conversation title
  app.patch("/api/conversations/:id/title", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: "Valid title is required" });
      }
      
      // Get the conversation
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Update the conversation
      const updatedConversation = await storage.createConversation({
        ...conversation,
        title: title.trim()
      });
      
      res.json(updatedConversation);
    } catch (error) {
      console.error("Error updating conversation title:", error);
      res.status(500).json({ message: "Failed to update conversation title" });
    }
  });
  
  // Update conversation personality
  app.patch("/api/conversations/:id/personality", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { personality } = req.body;
      
      // Validate personality
      const result = personalityTypeSchema.safeParse(personality);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid personality type",
          validOptions: personalityTypeSchema.options
        });
      }
      
      // Get the conversation
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Update the conversation personality
      const updatedConversation = await storage.updateConversationPersonality(id, result.data);
      
      // Return the updated conversation with personality details
      const personalityConfig = getPersonalityConfig(result.data);
      
      res.json({
        ...updatedConversation,
        personalityConfig: {
          name: personalityConfig.name,
          description: personalityConfig.description,
          emoji: personalityConfig.emoji
        }
      });
    } catch (error) {
      console.error("Error updating conversation personality:", error);
      res.status(500).json({ message: "Failed to update conversation personality" });
    }
  });
  
  // Get available personalities
  app.get("/api/personalities", async (_req: Request, res: Response) => {
    try {
      // Get all personality types from the schema
      const personalityTypes = personalityTypeSchema.options;
      
      // Map to include details for each personality
      const personalities = personalityTypes.map(type => {
        const config = getPersonalityConfig(type);
        return {
          id: type,
          name: config.name,
          description: config.description,
          emoji: config.emoji
        };
      });
      
      res.json(personalities);
    } catch (error) {
      console.error("Error fetching personalities:", error);
      res.status(500).json({ message: "Failed to fetch personalities" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
