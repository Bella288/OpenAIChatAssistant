import { MessageType } from "@shared/schema";
import path from 'path';
import fs from 'fs';

// This file provides a fallback mechanism when the OpenAI API is unavailable

// Sample responses based on common chat patterns
const commonResponses = {
  greeting: [
    "Hello! I'm a fallback AI assistant. How can I help you today?",
    "Hi there! I'm running in fallback mode due to API limitations. What can I assist you with?",
    "Greetings! I'm here to help, though I'm currently operating in a fallback capacity."
  ],
  farewell: [
    "Goodbye! Feel free to come back if you have more questions.",
    "Take care! Let me know if you need any more help later.",
    "Have a great day! I'll be here if you need assistance in the future."
  ],
  thankYou: [
    "You're welcome! Is there anything else I can help with?",
    "Happy to assist! Let me know if you have other questions.",
    "My pleasure! I'm here if you need more information."
  ],
  question: [
    "That's an interesting question. In fallback mode, I have limited capabilities, but I'd be happy to try my best to assist you.",
    "Great question! I'm currently operating in fallback mode due to API limitations, so my responses are somewhat limited.",
    "I wish I could provide a more detailed answer, but I'm currently in fallback mode due to API constraints."
  ],
  default: [
    "I understand you're looking for information. Currently, I'm operating in fallback mode due to API limitations.",
    "I appreciate your message. Right now, I'm running in a fallback capacity since the main AI service is unavailable.",
    "Thank you for your input. I'm currently in fallback mode, which means my responses are more limited than usual."
  ]
};

// Function to determine message intent based on content
function determineIntent(content: string): keyof typeof commonResponses {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('hello') || lowerContent.includes('hi ') || lowerContent.includes('hey') || lowerContent.match(/^hi$/)) {
    return 'greeting';
  } else if (lowerContent.includes('bye') || lowerContent.includes('goodbye') || lowerContent.includes('see you')) {
    return 'farewell';
  } else if (lowerContent.includes('thank') || lowerContent.includes('thanks') || lowerContent.includes('appreciate')) {
    return 'thankYou';
  } else if (lowerContent.includes('?') || lowerContent.includes('what') || lowerContent.includes('how') || 
            lowerContent.includes('why') || lowerContent.includes('when') || lowerContent.includes('where')) {
    return 'question';
  } else {
    return 'default';
  }
}

// Function to get a random response based on intent
function getRandomResponse(intent: keyof typeof commonResponses): string {
  const responses = commonResponses[intent];
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Main function to generate a fallback chat response
export async function generateFallbackResponse(messages: MessageType[]): Promise<string> {
  // Get the most recent user message
  const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
  
  if (!lastUserMessage) {
    return commonResponses.greeting[0]; // Default greeting if no user message found
  }
  
  // Determine intent and get appropriate response
  const intent = determineIntent(lastUserMessage.content);
  const response = getRandomResponse(intent);
  
  // Add disclaimer about fallback mode
  return `${response}\n\n(Note: I'm currently operating in fallback mode because the OpenAI API is unavailable)`;
}

// Check if we can use the OpenAI API
export async function canUseOpenAI(): Promise<boolean> {
  try {
    // A simple check to see if the OpenAI API key exists and has basic formatting
    const apiKey = process.env.OPENAI_API_KEY;
    // Check if the key exists and has a valid format (basic check)
    return Boolean(apiKey && apiKey.startsWith('sk-') && apiKey.length > 20);
  } catch (error) {
    console.error("Error checking OpenAI API availability:", error);
    return false;
  }
}