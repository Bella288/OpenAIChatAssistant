import { Client } from "@gradio/client";
import { z } from "zod";

// Define schema for image generation request
export const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(1000),
  seed: z.number().optional().default(0),
  randomize_seed: z.boolean().optional().default(true),
  width: z.number().min(256).max(1024).optional().default(512),
  height: z.number().min(256).max(1024).optional().default(512),
  guidance_scale: z.number().min(0).max(20).optional().default(7.5),
  num_inference_steps: z.number().min(1).max(50).optional().default(20),
});

// Type for image generation parameters
export type ImageGenerationParams = z.infer<typeof imageGenerationSchema>;

// Cache the client to avoid reconnecting on every request
let cachedClient: Client | null = null;

/**
 * Generates an image using the FLUX.1-dev model
 * @param params Image generation parameters
 * @returns URL of the generated image
 */
export async function generateImage(params: ImageGenerationParams): Promise<string> {
  try {
    // Initialize the client if it's not cached
    if (!cachedClient) {
      cachedClient = await Client.connect("black-forest-labs/FLUX.1-dev");
    }

    // Generate the image
    const result = await cachedClient.predict("/infer", {
      prompt: params.prompt,
      seed: params.seed,
      randomize_seed: params.randomize_seed,
      width: params.width,
      height: params.height,
      guidance_scale: params.guidance_scale,
      num_inference_steps: params.num_inference_steps,
    });

    // Extract the image URL from the result
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      // Return the URL of the generated image
      return result.data[0];
    } else {
      throw new Error("Failed to generate image: Invalid response format");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to check if FLUX model is available
export async function isFluxAvailable(): Promise<boolean> {
  try {
    // Try to connect to the FLUX model
    const hfToken = process.env.HF_TOKEN;
    // Only pass the token if it has the correct format
    const options = hfToken && hfToken.startsWith('hf_') ? { hf_token: hfToken as `hf_${string}` } : undefined;
    const client = await Client.connect("black-forest-labs/FLUX.1-dev", options);
    return !!client;
  } catch (error) {
    console.error("Error checking FLUX availability:", error);
    return false;
  }
}