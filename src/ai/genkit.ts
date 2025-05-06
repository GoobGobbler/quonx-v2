
import { genkit, configureGenkit } from 'genkit';
// Ensure correct imports for installed packages
// import { openRouter } from '@genkit-ai/openrouter'; // Removed as package@1.8.0 not found
// import { huggingFace } from '@genkit-ai/huggingface'; // Removed as package@1.8.0 not found
import { googleAI } from '@genkit-ai/googleai';
// Ollama models are accessed dynamically, no direct plugin import needed from genkitx-ollama
import type { Plugin } from 'genkit'; // Import Plugin type
import { z } from 'zod'; // Ensure zod is imported if used later

// Load environment variables
import { config } from 'dotenv';
config();

// Initialize plugins array
const plugins: Plugin<any>[] = [];

// Conditionally add Google AI plugin if API key is available
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI({ apiKey: process.env.GOOGLE_API_KEY }));
  console.log("Genkit: Google AI plugin configured.");
} else {
  console.warn("Genkit: GOOGLE_API_KEY not found in environment. Google AI plugin disabled.");
}

// Log warnings that OpenRouter and HuggingFace plugins are unavailable
console.warn("Genkit: OpenRouter plugin unavailable (@genkit-ai/openrouter@1.8.0 not found).");
console.warn("Genkit: Hugging Face plugin unavailable (@genkit-ai/huggingface@1.8.0 not found).");


// Note: Ollama models are accessed via their fully qualified names
// e.g., ai.model('ollama/llama3') without needing an explicit ollama plugin registration here.
// The genkitx-ollama package handles the underlying communication.
// We assume it's available if the user intends to use Ollama models.
console.log("Genkit: Ollama models can be accessed dynamically (e.g., 'ollama/llama3') if genkitx-ollama is installed and Ollama server is running.");


// Configure Genkit with the dynamically added plugins
configureGenkit({
  plugins: plugins,
  logLevel: 'debug', // Set desired log level (debug, info, warn, error)
  enableTracingAndMetrics: true, // Enable tracing for observability
});

// Export the configured ai object globally using Genkit 1.x pattern
export const ai = genkit();

// --- Define Model References (Examples - Adjust as needed) ---

// Ollama models are referenced dynamically like: ai.model('ollama/llama3')
// No need to define specific variables here unless for frequent use aliases.

// Google AI Models (available if GOOGLE_API_KEY is set)
export const geminiFlash = ai.model('googleai/gemini-1.5-flash-latest');
export const geminiPro = ai.model('googleai/gemini-1.5-pro-latest');
export const geminiProVision = ai.model('googleai/gemini-pro-vision'); // Vision model example

// OpenRouter and Hugging Face models are unavailable due to missing packages.
// Commented out references remain for future reference if packages become available.
// export const openRouterDefault = ai.model('openrouter/auto');
// export const openRouterClaudeHaiku = ai.model('openrouter/anthropic/claude-3-haiku');
// export const hfCodeLlama = ai.model('huggingface/codellama/CodeLlama-7b-hf');

console.log(`Genkit initialized with ${plugins.length} active plugin(s).`);
if (plugins.length === 0) {
    console.warn("Genkit: No cloud AI plugins were configured due to missing API keys.");
}
