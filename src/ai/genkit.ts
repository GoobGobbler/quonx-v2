import {genkit} from 'genkit';
import {ollama} from '@genkit-ai/community-ollama'; // Import the Ollama plugin from the community package

export const ai = genkit({
  plugins: [
    ollama({ // Use the Ollama plugin
      model: 'llama3', // Set a default model (can be overridden in flows)
      serverAddress: 'http://127.0.0.1:11434', // Default Ollama server address
    }),
  ],
  // Remove the top-level model definition, it's handled within the plugin now.
});
