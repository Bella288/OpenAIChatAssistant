import { 
  type Message, 
  type InsertMessage, 
  type Conversation, 
  type InsertConversation,
  PersonalityType,
  messageRoleSchema
} from "@shared/schema";

// Storage interface for conversations and messages
export interface IStorage {
  // Message operations
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessages(conversationId: string): Promise<void>;
  
  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;
  updateConversationPersonality(id: string, personality: PersonalityType): Promise<Conversation | undefined>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private conversations: Map<string, Conversation>;
  private currentMessageId: number;

  constructor() {
    this.messages = new Map();
    this.conversations = new Map();
    this.currentMessageId = 1;
    
    // Create default conversation
    const defaultConversation: Conversation = {
      id: "default",
      title: "New Conversation",
      createdAt: new Date(),
      personality: "default"
    };
    
    this.conversations.set(defaultConversation.id, defaultConversation);
  }

  // Message operations
  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }
  
  async deleteMessages(conversationId: string): Promise<void> {
    // Get all message IDs for this conversation
    const messageIds = Array.from(this.messages.entries())
      .filter(([_id, message]) => message.conversationId === conversationId)
      .map(([id, _message]) => id);
    
    // Delete each message
    for (const id of messageIds) {
      this.messages.delete(id);
    }
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const newConversation: Conversation = {
      ...conversation,
      personality: conversation.personality || "default",
      createdAt: new Date()
    };
    this.conversations.set(conversation.id, newConversation);
    return newConversation;
  }
  
  async deleteConversation(id: string): Promise<boolean> {
    // Check if conversation exists
    if (!this.conversations.has(id)) {
      return false;
    }
    
    // Don't allow deleting the default conversation
    if (id === "default") {
      return false;
    }
    
    // Delete all messages in the conversation first
    await this.deleteMessages(id);
    
    // Delete the conversation
    this.conversations.delete(id);
    return true;
  }
  
  async updateConversationPersonality(id: string, personality: PersonalityType): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      return undefined;
    }
    
    const updatedConversation = {
      ...conversation,
      personality
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
}

export const storage = new MemStorage();
