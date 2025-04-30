export interface Message {
  id?: number;
  content: string;
  role: "user" | "assistant" | "system";
  conversationId?: string;
  createdAt?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string;
}

export interface ChatInputFormProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

export interface ConnectionStatusProps {
  isConnected: boolean;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
}
