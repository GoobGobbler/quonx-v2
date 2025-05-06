import { config } from 'dotenv';
config(); // Load .env variables for API keys

// Import the main Genkit configuration
import '@/ai/genkit';

// Ensure flows are imported so Genkit recognizes them
import '@/ai/flows/generate-code-from-prompt';

// If new flows or tools are added, import them here as well.
// Example: import '@/ai/agents/code-assistant.ts';
