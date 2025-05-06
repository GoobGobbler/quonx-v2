
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

// Configure Genkit with multiple AI providers
configureGenkit({
  plugins: [
    // OpenRouter (Cloud - requires API key) - Commented out due to package not found
    // openRouter({
    //   apiKey: process.env.OPENROUTER_API_KEY, // Get key from .env
    // }),

    // Hugging Face Inference API (Cloud - requires API key)
    // Removed as package@1.8.0 not found

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

// Define model references (examples - adjust names as needed)
// Ollama models are referenced like: ai.model('ollama/llama3') - dynamically based on listOllamaModels
export const geminiPro = googleAI.model('googleai/gemini-1.5-flash-latest');
export const geminiProVision = googleAI.model('googleai/gemini-pro-vision'); // Example Vision model
// export const openRouterDefault = openRouter.model('openrouter/auto'); // OpenRouter auto-routing - Removed
// export const hfCodeLlama = huggingFace.model('huggingface/codellama/CodeLlama-7b-hf'); // Example HF model - Removed

// Export the configured ai object globally
export const ai = genkit();
