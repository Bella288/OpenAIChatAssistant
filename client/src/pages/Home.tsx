import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useChat } from '@/lib/hooks';
import { useAuth } from '@/hooks/useAuth';
import ChatHistory from '@/components/ChatHistory';
import ChatInputForm from '@/components/ChatInputForm';
import ConnectionStatus from '@/components/ConnectionStatus';
import ConversationSidebar from '@/components/ConversationSidebar';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Menu, MessageSquare, Image, Video } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { nanoid } from 'nanoid';

const Home: React.FC = () => {
  const { user, login, signup, logout } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationId, setConversationId] = useState("default");
  const [errorVisible, setErrorVisible] = useState(true);
  
  const { 
    messages, 
    isLoading, 
    error, 
    isConnected,
    currentModel, 
    sendMessage,
    loadMessages
  } = useChat(conversationId);
  
  // Handle creating a new conversation
  const handleNewConversation = async () => {
    try {
      // Create a new conversation on the server
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: ''  // Let the server generate a title
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create new conversation');
      }
      
      const newConversation = await response.json();
      setConversationId(newConversation.id);
      
      // Load empty conversation (will show welcome message)
      messages.loadMessages(newConversation.id);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };
  
  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    if (id === conversationId) {
      // Already selected, just close the sidebar
      setSidebarOpen(false);
      return;
    }
    
    setConversationId(id);
    // Load message history for this conversation
    messages.loadMessages(id);
    // Close sidebar on mobile after selection
    setSidebarOpen(false);
  };
  
  // Handle sign in button click
  const handleSignIn = () => {
    navigate('/auth');
  };
  
  return (
    <div className="flex flex-col h-screen">
      {/* Conversation Sidebar */}
      <ConversationSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isSignedIn={!!user}
        onSignIn={handleSignIn}
        onSignOut={logout}
      />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-2 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="mr-4 hidden md:flex"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>Conversations</span>
            </Button>
            
            <h1 className="font-bold text-2xl text-primary">AI Chat Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <ConnectionStatus isConnected={isConnected} currentModel={currentModel} />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/image-generator">
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Image className="h-4 w-4 mr-2" />
                      <span>Image Generator</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create AI-generated images</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/video-generator">
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      <span>Video Generator</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create AI-generated videos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main chat container */}
      <main className="flex-1 overflow-hidden max-w-5xl w-full mx-auto px-4 sm:px-6 py-4">
        {/* Error message */}
        {error && errorVisible && (
          <Alert variant="destructive" className="mb-4 shadow-lg border-l-4 border-red-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription className="flex justify-between items-center">
              <div className="flex-1">
                <p className="font-medium text-red-800">{error}</p>
                {error.includes('API quota') && (
                  <p className="text-sm mt-1 text-gray-700">
                    This usually means the OpenAI API key has reached its limit or doesn't have a payment method associated with it.
                    The system will attempt to use the Qwen fallback model.
                  </p>
                )}
              </div>
              <button 
                onClick={() => setErrorVisible(false)}
                className="ml-2 text-foreground hover:text-foreground/80 p-1 flex-shrink-0"
                aria-label="Dismiss"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Chat history */}
        <ChatHistory 
          messages={messages} 
          isLoading={isLoading} 
          currentModel={currentModel} 
        />
      </main>

      {/* Input area */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 sm:px-6 shadow-inner">
        <div className="max-w-5xl mx-auto">
          <ChatInputForm 
            onSendMessage={sendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </footer>
    </div>
  );
};

export default Home;
