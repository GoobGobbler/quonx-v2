// src/lib/ollama-client.ts
"use client"; // Mark as client component if used directly in one, or keep as utility

import { z } from 'zod';

// Define the expected structure of a model from the Ollama API (client-side)
const OllamaModelSchema = z.object({
  name: z.string(),
  model: z.string(),
  modified_at: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    format: z.string().optional(), // Make optional as it might vary
    family: z.string().optional(),
    families: z.array(z.string()).nullable().optional(),
    parameter_size: z.string().optional(),
    quantization_level: z.string().optional(),
  }),
});

export type OllamaModel = z.infer<typeof OllamaModelSchema>;

const ListModelsResponseSchema = z.object({
  models: z.array(OllamaModelSchema),
});

/**
 * Fetches the list of locally available Ollama models directly from the client.
 * Assumes Ollama server is running at the default address (http://127.0.0.1:11434).
 * @returns {Promise<OllamaModel[]>} A promise that resolves to an array of available models.
 * @throws {Error} If the connection fails or the response is invalid.
 */
export async function listLocalOllamaModels(): Promise<OllamaModel[]> {
  const ollamaUrl = 'http://127.0.0.1:11434/api/tags'; // Use the /api/tags endpoint

  try {
    const response = await fetch(ollamaUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      // Try to get more specific error info
      let errorBody = 'Failed to fetch';
      try {
        errorBody = await response.text();
      } catch (_) {}
       if (response.status === 404) {
         throw new Error('Ollama API endpoint not found. Is Ollama running at http://127.0.0.1:11434?');
       }
      throw new Error(`Failed to fetch Ollama models: ${response.status} ${response.statusText}. ${errorBody}`);
    }

    const data = await response.json();

    // Validate the response structure
    const parsedResponse = ListModelsResponseSchema.safeParse(data);
    if (!parsedResponse.success) {
      console.error("Invalid response structure from Ollama list models:", parsedResponse.error);
      throw new Error("Failed to parse Ollama models list. Invalid format.");
    }

    // Sort models alphabetically by name
    parsedResponse.data.models.sort((a, b) => a.name.localeCompare(b.name));


    return parsedResponse.data.models;
  } catch (error: any) {
    console.error('Client-side Ollama fetch failed:', error);
     if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
       throw new Error('Connection to Ollama server (http://127.0.0.1:11434) failed. Is Ollama running and accessible? Check CORS settings if applicable.');
     }
    throw new Error(`Failed to fetch models from Ollama: ${error.message}`);
  }
}
