import React from 'react';
import { ChatHistoryProps } from '@/lib/types';
import TypingIndicator from './TypingIndicator';
import { useScrollToBottom } from '@/lib/hooks';

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading }) => {
  const scrollRef = useScrollToBottom([messages, isLoading]);

  return (
    <div 
      ref={scrollRef}
      className="chat-container overflow-y-auto pb-4 px-2"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      {messages.map((message, index) => (
        <div 
          key={index}
          className={`flex items-start ${message.role === 'user' ? 'justify-end' : ''} mb-4`}
        >
          {message.role !== 'user' && (
            <div className="flex-shrink-0 mr-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
            </div>
          )}
          
          <div 
            className={`${
              message.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-800'
            } rounded-lg p-4 shadow-sm max-w-[85%]`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {message.role === 'user' && (
            <div className="flex-shrink-0 ml-3">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
      ))}
      
      <TypingIndicator isVisible={isLoading} />
    </div>
  );
};

export default ChatHistory;
