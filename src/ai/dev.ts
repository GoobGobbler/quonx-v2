import { config } from 'dotenv';
config();

// Ensure flows are imported so Genkit recognizes them
import '@/ai/flows/generate-code-from-prompt.ts';
// Removed import for incorporate-successful-code.ts as it's unused.

// If new flows or tools are added, import them here as well.
// Example: import '@/ai/agents/code-assistant.ts';

