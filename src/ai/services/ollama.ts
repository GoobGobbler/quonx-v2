'use server';
/**
 * @fileOverview Service for interacting with the local Ollama server.
 */
import Ollama from 'ollama-node';
import { z } from 'zod';

// Define the expected structure of a model from the Ollama API
const OllamaModelSchema = z.object({
  name: z.string(),
  model: z.string(),
  modified_at: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).nullable(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
});

export type OllamaModel = z.infer<typeof OllamaModelSchema>;

const ListModelsResponseSchema = z.object({
  models: z.array(OllamaModelSchema),
});

/**
 * Fetches the list of locally available Ollama models.
 * Assumes Ollama server is running at the default address (http://127.0.0.1:11434).
 * @returns {Promise<OllamaModel[]>} A promise that resolves to an array of available models.
 * @throws {Error} If the connection fails or the response is invalid.
 */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const ollama = new Ollama(); // Defaults to http://127.0.0.1:11434
    // Check connection first (optional but good practice)
    await ollama.ping();

    const response = await ollama.listModels();

    // Validate the response structure (optional but recommended)
    const parsedResponse = ListModelsResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
        console.error("Invalid response structure from Ollama list models:", parsedResponse.error);
        throw new Error("Failed to parse Ollama models list. Invalid format.");
    }

    return parsedResponse.data.models;
  } catch (error: any) {
    console.error('Failed to list Ollama models:', error);
     if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Connection to Ollama server failed. Is Ollama running at http://127.0.0.1:11434?');
    }
    throw new Error(`Failed to fetch models from Ollama: ${error.message}`);
  }
}
