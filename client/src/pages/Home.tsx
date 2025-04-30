import React, { useState } from 'react';
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
    sendMessage 
  } = useChat();
  
  const [errorVisible, setErrorVisible] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-2xl text-primary">AI Chat Assistant</h1>
          <div className="flex items-center space-x-2">
            <ConnectionStatus isConnected={isConnected} />
            
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setErrorVisible(false)}
                className="text-foreground hover:text-foreground/80"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Chat history */}
        <ChatHistory messages={messages} isLoading={isLoading} />
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
