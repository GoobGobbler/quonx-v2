

import { genkit, configureGenkit } from 'genkit';
// Remove direct import of ollama plugin
// import { ollama } from 'genkitx-ollama';
import { openRouter } from '@genkit-ai/openrouter';
import { huggingFace } from '@genkit-ai/huggingface';
import { googleAI } from '@genkit-ai/googleai';
// import { defineDotprompt } from '@genkit-ai/dotprompt';
import { z } from 'zod'; // Ensure zod is imported if used later

// Load environment variables
import { config } from 'dotenv';
config();

// Configure Genkit with multiple AI providers
configureGenkit({
  plugins: [
    // Ollama (Local) - Uses the community plugin
    // Access Ollama models dynamically - no direct plugin import needed
    // ollama({
    //   // Default model can be overridden in flows/prompts
    //   // serverAddress is default http://127.0.0.1:11434
    // }),

    // OpenRouter (Cloud - requires API key)
    openRouter({
      apiKey: process.env.OPENROUTER_API_KEY, // Get key from .env
    }),

    // Hugging Face Inference API (Cloud - requires API key)
    huggingFace({
      apiKey: process.env.HUGGING_FACE_API_KEY, // Get key from .env
    }),

    // Google AI / Gemini (Cloud - requires API key)
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY, // Get key from .env
    }),
  ],
  logLevel: 'debug', // Set desired log level
  enableTracingAndMetrics: true, // Enable tracing
});

// Define model references (examples - adjust names as needed)
// Ollama models are referenced like: ai.model('ollama/llama3') - dynamically based on listOllamaModels
export const geminiPro = googleAI.model('googleai/gemini-1.5-flash-latest');
export const geminiProVision = googleAI.model('googleai/gemini-pro-vision'); // Example Vision model
export const openRouterDefault = openRouter.model('openrouter/auto'); // OpenRouter auto-routing
export const hfCodeLlama = huggingFace.model('huggingface/codellama/CodeLlama-7b-hf'); // Example HF model

// Export the configured ai object globally
export const ai = genkit();

// Example of loading a Dotprompt (optional, if you use .prompt files)
// defineDotprompt(
//   {
//     name: 'myPrompt',
//     model: geminiPro,
//     input: { schema: z.object({ name: z.string() }) },
//     output: { format: 'text' },
//   },
//   `Say hello to {{name}}.`,
// );







