import {genkit} from 'genkit';
import {ollama} from '@genkit-ai/googleai'; // Import the Ollama plugin from Google AI for now, as requested package is missing

export const ai = genkit({
  plugins: [
    ollama({ // Use the Ollama plugin
      model: 'llama3', // Set a default model (can be overridden in flows)
      serverAddress: 'http://127.0.0.1:11434', // Default Ollama server address
    }),
  ],
  // Remove the top-level model definition, it's handled within the plugin now.
});

