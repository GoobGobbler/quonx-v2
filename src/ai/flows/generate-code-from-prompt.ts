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
import { ModelReference } from 'genkit/model';

// Define known model prefixes to help resolve model references
const KNOWN_PROVIDER_PREFIXES = ['ollama/', 'googleai/', 'openrouter/', 'huggingface/'];

const GenerateCodeFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt describing the application or code to build.'),
  previousCode: z.string().optional().describe('The code from the previous successful build, if any.'),
  modelName: z.string().describe('The fully qualified name of the model to use (e.g., "ollama/llama3", "googleai/gemini-1.5-flash-latest", "openrouter/anthropic/claude-3-haiku").'),
});
export type GenerateCodeFromPromptInput = z.infer<typeof GenerateCodeFromPromptInputSchema>;

const GenerateCodeFromPromptOutputSchema = z.object({
  code: z.string().describe('The generated code for the application.'),
});
export type GenerateCodeFromPromptOutput = z.infer<typeof GenerateCodeFromPromptOutputSchema>;

export async function generateCodeFromPrompt(input: GenerateCodeFromPromptInput): Promise<GenerateCodeFromPromptOutput> {
  return generateCodeFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCodeFromPromptPrompt',
  input: { schema: GenerateCodeFromPromptInputSchema },
  output: { schema: GenerateCodeFromPromptOutputSchema },
  prompt: `You are an expert software developer that can write code based on a prompt.

  Generate the code for the following application based *only* on the user prompt and optional previous code.
  Produce complete, runnable code for the requested file or component.
  Adhere strictly to the format and language requested in the prompt. Pay close attention to file names and structure if specified.

  User Prompt:
  {{{prompt}}}

  {{#if previousCode}}
  Here is the code from the previous successful build. Incorporate it into the current build only if it is directly relevant to the current prompt and helps fulfill the request. Do not reuse it otherwise.
  Previous Code:
  {{{previousCode}}}
  {{/if}}

  Generate the new code now:`,
});

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
      modelToUse = ai.model(input.modelName);

      if (!modelToUse) {
        // This case might be less likely if ai.model throws, but good for safety
        throw new Error(`Model "${input.modelName}" not found or configured in Genkit.`);
      }

    } catch (error: any) {
        console.error(`Error resolving model "${input.modelName}":`, error);
        throw new Error(`Failed to find or configure the specified model: ${input.modelName}. Check configuration and API keys. Details: ${error.message}`);
    }

    // Prepare input for the prompt, removing the modelName as it's not part of the prompt template
    const promptInput = {
        prompt: input.prompt,
        previousCode: input.previousCode,
        // modelName is *not* passed here, it's used in the flow options below
    };

    const { output } = await prompt(promptInput, { model: modelToUse });
    if (!output) {
        throw new Error('Received no output from the AI model.');
    }
    return output;
  }
);
