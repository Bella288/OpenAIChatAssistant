import { 
  type Message, 
  type InsertMessage, 
  type Conversation, 
  type InsertConversation,
  messageRoleSchema
} from "@shared/schema";

// Storage interface for conversations and messages
export interface IStorage {
  // Message operations
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
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
      createdAt: new Date()
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
      createdAt: new Date()
    };
    this.conversations.set(conversation.id, newConversation);
    return newConversation;
  }
}

export const storage = new MemStorage();
