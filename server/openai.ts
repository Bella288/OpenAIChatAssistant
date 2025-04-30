import OpenAI from "openai";
import { MessageType } from "@shared/schema";
import { generateFallbackResponse, canUseOpenAI } from "./fallbackChat";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const systemMessage: MessageType = {
  role: "system",
  content: `You are a helpful AI assistant. Provide concise and accurate responses to user queries. 
  Your goal is to be informative and educational. Use clear language and provide examples where appropriate.
  Always be respectful and considerate in your responses.`
};

// Flag to track if we've already logged an OpenAI API error
let hasLoggedOpenAIError = false;

export async function generateChatResponse(messages: MessageType[]): Promise<string> {
  try {
    // Check if we can use OpenAI API
    const openAIAvailable = await canUseOpenAI();
    
    // If OpenAI API is not available, use fallback
    if (!openAIAvailable) {
      console.log("OpenAI API not available, using fallback mechanism");
      return await generateFallbackResponse(messages);
    }
    
    // Always include system message at the beginning
    const conversationWithSystem = [systemMessage, ...messages];
    
    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: conversationWithSystem,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract and return the generated text
    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // If we get an error, use the fallback mechanism
    console.log("Switching to fallback mechanism due to OpenAI API error");
    
    try {
      // Try to generate a fallback response
      return await generateFallbackResponse(messages);
    } catch (fallbackError) {
      console.error("Fallback mechanism also failed:", fallbackError);
      
      // If the fallback also fails, throw the original error with better handling
      if (error.response) {
        // API returned an error response
        const status = error.response.status;
        if (status === 429) {
          if (error.code === 'insufficient_quota') {
            throw new Error("OpenAI API quota exceeded. Your account may need a valid payment method or has reached its limit.");
          } else {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
        } else if (status === 401) {
          throw new Error("API key is invalid or expired.");
        } else {
          throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        throw new Error("No response received from OpenAI. Please check your internet connection.");
      } else {
        // Something else happened
        throw new Error(`Error: ${error.message}`);
      }
    }
  }
}
