import OpenAI from "openai";
import { MessageType } from "@shared/schema";
import { generateFallbackResponse, canUseOpenAI, canUseQwen } from "./fallbackChat";

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

// Flag to track current model in use
let currentModel: 'openai' | 'qwen' | 'unavailable' = 'openai';

export async function generateChatResponse(messages: MessageType[]): Promise<string> {
  try {
    // Check if we can use OpenAI API
    const openAIAvailable = await canUseOpenAI();
    
    // If OpenAI API is not available, check if Qwen is available
    if (!openAIAvailable) {
      const qwenAvailable = await canUseQwen();
      
      if (qwenAvailable) {
        if (currentModel !== 'qwen') {
          console.log("Switching to Qwen model as fallback");
          currentModel = 'qwen';
        }
        
        // Use Qwen fallback
        return await generateFallbackResponse(messages);
      } else {
        // Neither OpenAI nor Qwen is available
        currentModel = 'unavailable';
        throw new Error("Both OpenAI and Qwen models are unavailable. Please check your API keys.");
      }
    }
    
    // If we get here, we're using OpenAI
    if (currentModel !== 'openai') {
      console.log("Using OpenAI model");
      currentModel = 'openai';
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
    console.error("AI Model error:", error);
    
    // If we have an OpenAI error, try using Qwen as fallback
    if (currentModel === 'openai') {
      console.log("OpenAI API error, attempting to use Qwen fallback");
      
      try {
        const qwenAvailable = await canUseQwen();
        
        if (qwenAvailable) {
          currentModel = 'qwen';
          return await generateFallbackResponse(messages);
        } else {
          currentModel = 'unavailable';
        }
      } catch (fallbackError) {
        console.error("Qwen fallback also failed:", fallbackError);
        currentModel = 'unavailable';
      }
    }
    
    // If we've gotten this far, all fallbacks have failed, provide a helpful error
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
      throw new Error("No response received from AI service. Please check your internet connection.");
    } else {
      // Something else happened
      throw new Error(`Error: ${error.message}`);
    }
  }
}
