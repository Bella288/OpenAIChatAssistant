import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from './queryClient';
import { Message, ChatResponse, ModelStatus } from './types';

// Hook for fetching model status
export function useModelStatus() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    model: 'openai',
    isOpenAIAvailable: true,
    isQwenAvailable: true,
    lastChecked: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchModelStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/model-status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch model status');
      }
      
      const data = await response.json() as ModelStatus;
      setModelStatus(data);
    } catch (error) {
      console.error('Error fetching model status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchModelStatus();
    
    // Refresh model status every 5 minutes
    const interval = setInterval(fetchModelStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchModelStatus]);
  
  return {
    modelStatus,
    isLoading,
    refetch: fetchModelStatus
  };
}

// Hook for managing chat state
export function useChat(initialConversationId = "default") {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [currentModel, setCurrentModel] = useState<'openai' | 'qwen' | 'unavailable'>('openai');

  // Load message history for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load message history');
      }
      
      const data = await response.json() as Message[];
      if (data.length > 0) {
        setMessages(data);
      } else {
        // Reset to welcome message if no messages
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm your AI assistant. How can I help you today?"
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message to the API
  const sendMessage = useCallback(async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add user message to state immediately for UI
      const userMessage: Message = {
        role: "user",
        content
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Prepare message history for API
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message
      messageHistory.push({
        role: userMessage.role,
        content: userMessage.content
      });
      
      // Make API request
      const response = await apiRequest('POST', '/api/chat', {
        messages: messageHistory,
        conversationId
      });
      
      const data = await response.json() as ChatResponse;
      
      // Add the assistant's response to state
      setMessages(prev => [...prev, data.message]);
      
      // Update current model if provided
      if (data.modelInfo && data.modelInfo.model) {
        setCurrentModel(data.modelInfo.model as 'openai' | 'qwen' | 'unavailable');
      }
      
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to send message';
      
      // Check if it's a quota exceeded error and provide a more friendly message
      if (errorMessage.includes('quota exceeded') || errorMessage.includes('insufficient_quota')) {
        errorMessage = "The OpenAI API quota has been exceeded. This often happens with free accounts. The system will attempt to use the Qwen fallback model.";
      }
      
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId]);

  // Clear the current conversation
  const clearConversation = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you today?"
      }
    ]);
  }, []);

  // Update connection status
  const [isConnected, setIsConnected] = useState(true);
  
  useEffect(() => {
    // Check connection on mount
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health');
        setIsConnected(response.ok);
      } catch (err) {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    
    // Setup interval to check connection status
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    isConnected,
    currentModel,
    sendMessage,
    clearConversation,
    loadMessages,
    setConversationId
  };
}

// Hook to scroll to bottom of chat
export function useScrollToBottom(dependency: any) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dependency]);
  
  return ref;
}
