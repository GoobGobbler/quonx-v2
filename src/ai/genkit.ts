
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

// --- Google AI Plugin ---
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI({ apiKey: process.env.GOOGLE_API_KEY }));
  console.log("Genkit: Google AI plugin configured.");
} else {
  console.warn("Genkit: GOOGLE_API_KEY not found in environment. Google AI plugin disabled.");
}

// --- OpenRouter Plugin ---
// Check for OpenRouter API Key
// const isOpenRouterConfigured = !!process.env.OPENROUTER_API_KEY;
// Package for OpenRouter is assumed to be missing based on previous error logs (@genkit-ai/openrouter@1.8.0 not found)
const isOpenRouterPluginAvailable = false; // Explicitly set to false due to missing package

if (isOpenRouterPluginAvailable) {
    // This block would be active if the package was found and an API key was present
    // if (isOpenRouterConfigured) {
    //   plugins.push(openRouter({ apiKey: process.env.OPENROUTER_API_KEY }));
    //   console.log("Genkit: OpenRouter plugin configured.");
    // } else {
    //   console.warn("Genkit: OPENROUTER_API_KEY not found. OpenRouter plugin not loaded despite package presence.");
    // }
} else {
    console.warn("Genkit: OpenRouter plugin unavailable (@genkit-ai/openrouter package not found or not version 1.8.0).");
    // if (isOpenRouterConfigured) {
    //     console.warn("Genkit: OPENROUTER_API_KEY is set, but the plugin package is missing or incorrect version.");
    // }
}


// --- Hugging Face Plugin ---
// Check for Hugging Face API Key
// const isHuggingFaceConfigured = !!process.env.HF_API_KEY;
// Package for HuggingFace is assumed to be missing based on previous error logs (@genkit-ai/huggingface@1.8.0 not found)
const isHuggingFacePluginAvailable = false; // Explicitly set to false due to missing package

if (isHuggingFacePluginAvailable) {
    // This block would be active if the package was found and an API key was present
    // if (isHuggingFaceConfigured) {
    //   plugins.push(huggingFace({ apiKey: process.env.HF_API_KEY }));
    //   console.log("Genkit: Hugging Face plugin configured.");
    // } else {
    //   console.warn("Genkit: HF_API_KEY not found. Hugging Face plugin not loaded despite package presence.");
    // }
} else {
    console.warn("Genkit: Hugging Face plugin unavailable (@genkit-ai/huggingface package not found or not version 1.8.0).");
    // if (isHuggingFaceConfigured) {
    //     console.warn("Genkit: HF_API_KEY is set, but the plugin package is missing or incorrect version.");
    // }
}


// --- Ollama ---
// Ollama models are accessed via their fully qualified names (e.g., ai.model('ollama/llama3')).
// The genkitx-ollama package handles the communication.
// We assume it's available if the user intends to use Ollama models and has it installed.
console.log("Genkit: Ollama models can be accessed dynamically (e.g., 'ollama/llama3') if genkitx-ollama is installed and Ollama server is running.");


// Configure Genkit with the dynamically added plugins
configureGenkit({
  plugins: plugins,
  logLevel: 'debug', // Set desired log level (debug, info, warn, error)
  enableTracingAndMetrics: true, // Enable tracing for observability (MLOps integration point)
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

// Examples of how OpenRouter and Hugging Face models *would* be referenced if available and configured
// export const openRouterDefault = ai.model('openrouter/auto');
// export const openRouterClaudeHaiku = ai.model('openrouter/anthropic/claude-3-haiku');
// export const hfCodeLlama = ai.model('huggingface/codellama/CodeLlama-7b-hf');

console.log(`Genkit initialized with ${plugins.length} active plugin(s).`);
if (plugins.length === 0) {
    console.warn("Genkit: No cloud AI plugins were configured due to missing API keys. Ollama access remains dynamic.");
}
if (!isOpenRouterPluginAvailable) console.warn("Genkit: OpenRouter models unavailable.");
if (!isHuggingFacePluginAvailable) console.warn("Genkit: Hugging Face models unavailable.");
