import { config } from 'dotenv';
config(); // Load .env variables for API keys

// Import the main Genkit configuration
import '@/ai/genkit';

// Ensure flows are imported so Genkit recognizes them
import '@/ai/flows/generate-code-from-prompt';
// Import other potential flows or agent definitions if they exist
// import '@/ai/agents/code-assistant'; // Example placeholder
// import '@/ai/agents/project-architect'; // Example placeholder
// import '@/ai/agents/security-analyst'; // Example placeholder
// import '@/ai/agents/firebase-expert'; // Example placeholder
// import '@/ai/tools/security-scanner'; // Example placeholder
// import '@/ai/tools/file-system'; // Example placeholder
// import '@/ai/tools/deployment'; // Example placeholder
// import '@/ai/tools/long-term-memory'; // Example placeholder

console.log("Genkit development server starting with imported flows/agents...");
