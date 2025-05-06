
import { genkit, configureGenkit } from 'genkit';
// Ensure correct imports for installed packages
// import { openRouter } from '@genkit-ai/openrouter'; // Removed as package@1.8.0 not found
// import { huggingFace } from '@genkit-ai/huggingface'; // Removed as package@1.8.0 not found
import { googleAI } from '@genkit-ai/googleai';
// Ollama models are accessed dynamically, no direct plugin import needed from genkitx-ollama
import { z } from 'zod'; // Ensure zod is imported if used later

// Load environment variables
import { config } from 'dotenv';
config();

// Configure Genkit with available AI providers
// Using configureGenkit for setup, ai = genkit() for global instance
configureGenkit({
  plugins: [
    // OpenRouter (Cloud - requires API key) - Commented out due to package not found
    // openRouter({
    //   apiKey: process.env.OPENROUTER_API_KEY, // Get key from .env
    // }),

    // Hugging Face Inference API (Cloud - requires API key) - Commented out due to package not found
    // huggingFace({
    //  apiKey: process.env.HF_API_KEY, // Get key from .env
    // }),

    // Google AI / Gemini (Cloud - requires API key)
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY, // Get key from .env
    }),

    // Note: Ollama models are accessed via their fully qualified names
    // e.g., ai.model('ollama/llama3') without needing an explicit ollama plugin registration here.
    // The genkitx-ollama package handles the underlying communication.
  ],
  logLevel: 'debug', // Set desired log level
  enableTracingAndMetrics: true, // Enable tracing
});

// Export the configured ai object globally using Genkit 1.x pattern
export const ai = genkit();

// Define model references (examples - adjust names as needed)
// Ollama models are referenced like: ai.model('ollama/llama3') - dynamically based on listLocalOllamaModels
export const geminiFlash = ai.model('googleai/gemini-1.5-flash-latest'); // Updated reference using ai object
export const geminiPro = ai.model('googleai/gemini-1.5-pro-latest'); // Updated reference using ai object
export const geminiProVision = ai.model('googleai/gemini-pro-vision'); // Example Vision model - updated reference

// Examples of how OpenRouter and Hugging Face models *would* be referenced if available
// export const openRouterDefault = ai.model('openrouter/auto');
// export const hfCodeLlama = ai.model('huggingface/codellama/CodeLlama-7b-hf');

