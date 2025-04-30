import React, { useState, useEffect } from 'react';
import { useChat } from '@/lib/hooks';
import ChatHistory from '@/components/ChatHistory';
import ChatInputForm from '@/components/ChatInputForm';
import ConnectionStatus from '@/components/ConnectionStatus';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Settings } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const Home: React.FC = () => {
  const { 
    messages, 
    isLoading, 
    error, 
    isConnected,
    currentModel, 
    sendMessage 
  } = useChat();
  
  const [errorVisible, setErrorVisible] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="font-bold text-2xl text-primary">AI Chat Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <ConnectionStatus isConnected={isConnected} currentModel={currentModel} />
            
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
