
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
  }).passthrough(), // Allow other details fields
});

export type OllamaModel = z.infer<typeof OllamaModelSchema>;

const ListModelsResponseSchema = z.object({
  models: z.array(OllamaModelSchema),
});

/**
 * Fetches the list of locally available Ollama models directly from the client.
 * Uses the provided base URL for the Ollama server.
 * @param {string} ollamaBaseUrl - The base URL of the Ollama server (e.g., 'http://127.0.0.1:11434').
 * @returns {Promise<OllamaModel[]>} A promise that resolves to an array of available models.
 * @throws {Error} If the URL is invalid, connection fails, or the response is invalid.
 */
export async function listLocalOllamaModels(ollamaBaseUrl: string): Promise<OllamaModel[]> {
   if (!ollamaBaseUrl || !ollamaBaseUrl.startsWith('http')) {
        throw new Error(`Invalid Ollama Base URL provided: ${ollamaBaseUrl}`);
   }

   // Ensure the URL doesn't have a trailing slash before appending the path
   const baseUrlClean = ollamaBaseUrl.endsWith('/') ? ollamaBaseUrl.slice(0, -1) : ollamaBaseUrl;
   const ollamaApiUrl = `${baseUrlClean}/api/tags`;

  console.log(`[ollama-client] Fetching models from: ${ollamaApiUrl}`);

  try {
    const response = await fetch(ollamaApiUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        cache: 'no-store', // Ensure fresh data
        // Add a reasonable timeout? fetch doesn't support it directly without AbortController
        // signal: AbortSignal.timeout(5000), // Example: 5 second timeout (requires browser support)
    });

    if (!response.ok) {
      // Try to get more specific error info
      let errorBody = 'Failed to fetch';
      try {
        errorBody = await response.text();
        // Attempt to parse as JSON for more structured errors
        const errorJson = JSON.parse(errorBody);
        errorBody = errorJson.error || errorBody;
      } catch (_) {}
       console.error(`[ollama-client] Error response (${response.status}): ${errorBody}`);
       if (response.status === 404) {
         throw new Error(`Ollama API endpoint not found at ${ollamaApiUrl}. Is Ollama running and the URL correct?`);
       }
       // Handle common connection refused error (might appear as 'Failed to fetch')
       // Note: Specific error types like ECONNREFUSED are not directly available in browser fetch
       if (errorBody.includes('Failed to fetch')) {
            throw new Error(`Connection refused or network error trying to reach Ollama at ${ollamaBaseUrl}. Ensure it's running and accessible.`);
       }
      throw new Error(`Failed to fetch Ollama models (${response.status} ${response.statusText}). ${errorBody}`);
    }

    const data = await response.json();
    console.log("[ollama-client] Received data:", data);


    // Validate the response structure
    const parsedResponse = ListModelsResponseSchema.safeParse(data);
    if (!parsedResponse.success) {
      console.error("[ollama-client] Invalid response structure from Ollama /api/tags:", parsedResponse.error);
      throw new Error("Failed to parse Ollama models list. Invalid format received from server.");
    }

    // Sort models alphabetically by name
    parsedResponse.data.models.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[ollama-client] Successfully parsed and sorted ${parsedResponse.data.models.length} models.`);
    return parsedResponse.data.models;

  } catch (error: any) {
    console.error('[ollama-client] Client-side Ollama fetch failed:', error);
     // Catch fetch-specific errors (like network issues, CORS)
     if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
       throw new Error(`Network error connecting to Ollama at ${ollamaBaseUrl}. Check CORS settings and if the server is running/accessible.`);
     }
      // Rethrow other errors, potentially adding context
     throw new Error(`Failed to list models from Ollama at ${ollamaBaseUrl}: ${error.message}`);
  }
}
