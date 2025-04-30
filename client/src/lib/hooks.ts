import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from './queryClient';
import { Message, ChatResponse } from './types';

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
      
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
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
