import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse } from "./openai";
import { 
  messageSchema, 
  conversationSchema, 
  insertMessageSchema, 
  insertConversationSchema,
  messageRoleSchema
} from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

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

      // Return the AI response
      res.json({ 
        message: savedMessage,
        conversationId 
      });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to process chat message." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
