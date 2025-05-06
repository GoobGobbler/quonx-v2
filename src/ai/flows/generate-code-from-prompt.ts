'use server';
/**
 * @fileOverview An AI agent that generates code from a prompt using a selected model.
 *
 * - generateCodeFromPrompt - A function that handles the code generation process.
 * - GenerateCodeFromPromptInput - The input type for the generateCodeFromPrompt function.
 * - GenerateCodeFromPromptOutput - The return type for the generateCodeFromPrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ModelReference } from 'genkit/model'; // Use type import

// Define known model prefixes to help resolve model references
const KNOWN_PROVIDER_PREFIXES = ['ollama/', 'googleai/', 'openrouter/', 'huggingface/'];

const GenerateCodeFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt describing the application or code to build. Include details like language, framework, file structure, features, and any specific requirements (e.g., "generate unit tests").'),
  previousCode: z.string().optional().describe('The code from the previous successful build, if any. This provides context for edits or additions.'),
  modelName: z.string().describe('The fully qualified name of the model to use (e.g., "ollama/llama3", "googleai/gemini-1.5-flash-latest").'),
});
export type GenerateCodeFromPromptInput = z.infer<typeof GenerateCodeFromPromptInputSchema>;

const GenerateCodeFromPromptOutputSchema = z.object({
  code: z.string().describe('The generated code for the application or component.'),
});
export type GenerateCodeFromPromptOutput = z.infer<typeof GenerateCodeFromPromptOutputSchema>;

// --- Future Enhancements ---
// TODO: Implement separate agents (Code Assistant, Project Architect) as distinct flows or tools.
// TODO: Integrate long-term memory/context management beyond just the last successful code.
// TODO: Add MLOps integration points (e.g., logging experiment details).
// TODO: Integrate security scanning results or linters as tools or context.
// --------------------------

/**
 * Generates code based on a user prompt, potentially using previous code as context.
 * @param input - The input containing the prompt, previous code, and model name.
 * @returns A promise that resolves to the generated code.
 */
export async function generateCodeFromPrompt(input: GenerateCodeFromPromptInput): Promise<GenerateCodeFromPromptOutput> {
  // This function acts as the entry point, calling the underlying Genkit flow.
  // In a more complex system, this might route to different agents based on the prompt.
  return generateCodeFromPromptFlow(input);
}

// Define the core prompt template for code generation
const prompt = ai.definePrompt({
  name: 'generateCodeFromPromptPrompt',
  input: { schema: GenerateCodeFromPromptInputSchema },
  output: { schema: GenerateCodeFromPromptOutputSchema },
  prompt: `You are an expert software developer AI agent designed to generate high-quality, secure, and maintainable code based on user prompts within an IDE environment.

Generate the complete, runnable code for the following application or component based *strictly* on the user prompt and optional previous code.
Adhere to the requested format, language, file names, and project structure.
Prioritize code clarity, efficiency, and security best practices.
If the user requests unit tests, generate them alongside the main code.

User Prompt:
{{{prompt}}}

{{#if previousCode}}
Here is the code from the previous successful build. You can use this as context or modify it based on the new prompt. If the new prompt is unrelated, generate new code from scratch.
Previous Code:
{{{previousCode}}}
{{/if}}

Generate the new code now:`,
});

// Define the Genkit flow that orchestrates the code generation process
const generateCodeFromPromptFlow = ai.defineFlow(
  {
    name: 'generateCodeFromPromptFlow',
    inputSchema: GenerateCodeFromPromptInputSchema,
    outputSchema: GenerateCodeFromPromptOutputSchema,
  },
  async (input) => {
    let modelToUse: ModelReference<any> | undefined;

    try {
      // Validate if the model name seems correctly formatted (includes a provider prefix)
      const hasPrefix = KNOWN_PROVIDER_PREFIXES.some(prefix => input.modelName.startsWith(prefix));
      if (!hasPrefix) {
          throw new Error(`Invalid model name format: "${input.modelName}". Must include provider prefix (e.g., "ollama/llama3").`);
      }
      // Get the model reference using the provided string name
      // Note: This assumes the model (e.g., 'ollama/llama3') is available to Genkit.
      // For Ollama, this relies on the Ollama server being reachable by the environment running this flow.
      // For cloud models, it relies on correct plugin configuration and API keys in genkit.ts.
      modelToUse = ai.model(input.modelName);

      if (!modelToUse) {
        // This case might be less likely if ai.model throws, but good for safety
        throw new Error(`Model "${input.modelName}" not found or configured in Genkit.`);
      }

    } catch (error: any) {
        console.error(`Error resolving model "${input.modelName}":`, error);
        // Provide a more user-friendly error message
        let detailedMessage = `Failed to find or configure the specified model: ${input.modelName}.`;
        if (input.modelName.startsWith('ollama/')) {
            detailedMessage += ' Ensure the Ollama server is running and accessible.';
        } else {
            detailedMessage += ' Check Genkit configuration and ensure necessary API keys (e.g., GOOGLE_API_KEY) are set in your environment.';
        }
        detailedMessage += ` Details: ${error.message}`;
        throw new Error(detailedMessage);
    }

    // Prepare input for the prompt, removing the modelName as it's not part of the prompt template
    const promptInput = {
        prompt: input.prompt,
        previousCode: input.previousCode,
        // modelName is *not* passed here; it's used in the flow options below
    };

    // Execute the prompt with the selected model
    // TODO: Add validation pipeline here (syntax check, linting, dependency checks) before returning.
    // TODO: Implement retry logic with error feedback to the model if validation fails.
    const { output } = await prompt(promptInput, { model: modelToUse });

    if (!output) {
        // Handle cases where the model returns no output (e.g., content filtering)
        throw new Error('Received no output from the AI model. This could be due to content filtering or an internal model error.');
    }

    // TODO: Potentially post-process the output (e.g., format code, extract files if multiple generated).

    return output;
  }
);
