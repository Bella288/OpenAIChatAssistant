import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Changed to text for Replit Auth user IDs
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password"), // Optional now, not used with Replit Auth
  fullName: text("full_name"), // Match existing column name in DB
  location: text("location"),
  interests: text("interests").array(),
  profession: text("profession"),
  pets: text("pets"),
  systemContext: text("system_context"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const updateUserProfileSchema = createInsertSchema(users)
  .pick({
    fullName: true,
    location: true,
    interests: true,
    profession: true,
    pets: true,
    systemContext: true,
  })
  .partial(); // Make all fields optional

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Message model for chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  conversationId: text("conversation_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  conversationId: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Define the personality types
export const personalityTypeSchema = z.enum([
  "default",
  "professional", 
  "friendly", 
  "expert", 
  "poetic", 
  "concise"
]);

export type PersonalityType = z.infer<typeof personalityTypeSchema>;

// Conversation model to group messages
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  personality: text("personality").default("default").notNull(),
  userId: text("user_id").references(() => users.id),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  id: true,
  title: true,
  personality: true,
  userId: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Message role schema for validation
export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

// Message schema for API
export const messageSchema = z.object({
  content: z.string(),
  role: messageRoleSchema,
});

export type MessageType = z.infer<typeof messageSchema>;

// Conversation message format for OpenAI
export const conversationSchema = z.object({
  messages: z.array(messageSchema),
  personality: personalityTypeSchema.optional().default("default"),
  conversationId: z.string().optional(),
  userId: z.number().optional()
});

export type ConversationType = z.infer<typeof conversationSchema>;
