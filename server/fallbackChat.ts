import { MessageType } from "@shared/schema";
import { InferenceClient } from "@huggingface/inference";

// This file provides a fallback mechanism when the OpenAI API is unavailable
// Using the Qwen model through the Novita API via Hugging Face Inference

// Initialize the Hugging Face client with the Novita API key
const novitaApiKey = process.env.NOVITA_API_KEY || '';
const huggingFaceClient = new InferenceClient(novitaApiKey);

// Qwen model configuration
const QWEN_MODEL = "Qwen/Qwen3-235B-A22B";
const MAX_TOKENS = 512;

// System message to help guide the Qwen model
const QWEN_SYSTEM_MESSAGE = `You are a helpful AI assistant. Provide clear, concise responses without showing your thinking process.
Do not use XML tags like <think> or </think> in your responses.
Keep your responses informative, friendly, and to the point.`;

// Convert our message format to the format expected by the Hugging Face API
function convertMessages(messages: MessageType[]): Array<{role: string, content: string}> {
  // Start with our system message
  const formattedMessages = [{
    role: "system",
    content: QWEN_SYSTEM_MESSAGE
  }];
  
  // Filter out any existing system messages from the input
  const compatibleMessages = messages.filter(msg => msg.role !== 'system');
  
  // If no messages are left, add a default user message
  if (compatibleMessages.length === 0) {
    formattedMessages.push({
      role: "user",
      content: "Hello, can you introduce yourself?"
    });
    return formattedMessages;
  }
  
  // Make sure the last message is from the user
  const lastMessage = compatibleMessages[compatibleMessages.length - 1];
  if (lastMessage.role !== 'user') {
    // If the last message isn't from a user, add a generic user query
    compatibleMessages.push({
      role: "user",
      content: "Can you help me with this?"
    });
  }
  
  // Add all the compatible messages
  formattedMessages.push(...compatibleMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  })));
  
  return formattedMessages;
}

// Main function to generate a fallback chat response using Qwen
export async function generateFallbackResponse(messages: MessageType[]): Promise<string> {
  try {
    console.log("Generating fallback response using Qwen model");
    
    // Convert messages to the format expected by the Hugging Face API
    const formattedMessages = convertMessages(messages);
    
    // Make the API call to the Qwen model via Novita
    const response = await huggingFaceClient.chatCompletion({
      provider: "novita",
      model: QWEN_MODEL,
      messages: formattedMessages,
      max_tokens: MAX_TOKENS,
    });
    
    // Extract and return the generated text
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      // Clean up the response - remove any thinking process or XML-like tags
      let content = response.choices[0].message.content || '';
      
      // Remove the <think> sections that might appear in the response
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      
      // Remove any other XML-like tags
      content = content.replace(/<[^>]*>/g, '');
      
      // Clean up any excessive whitespace
      content = content.replace(/^\s+|\s+$/g, '');
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // If content is empty after cleanup, provide a default message
      if (!content.trim()) {
        content = "I'm sorry, I couldn't generate a proper response.";
      }
      
      // Add a note that this is using the fallback model
      return `${content}\n\n(Note: I'm currently operating in fallback mode using the Qwen model because the OpenAI API is unavailable)`;
    } else {
      throw new Error("No valid response from Qwen model");
    }
  } catch (error) {
    console.error("Error generating response with Qwen model:", error);
    
    // If the Qwen model fails, return a simple fallback message
    return "I apologize, but I'm currently experiencing technical difficulties with both primary and fallback AI services. Please try again later.";
  }
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

// Check if we can use the Qwen model via Novita
export async function canUseQwen(): Promise<boolean> {
  try {
    // Check if the Novita API key exists
    return Boolean(novitaApiKey && novitaApiKey.length > 0);
  } catch (error) {
    console.error("Error checking Qwen availability:", error);
    return false;
  }
}