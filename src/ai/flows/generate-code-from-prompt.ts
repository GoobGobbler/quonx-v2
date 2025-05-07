
'use server';
/**
 * @fileOverview An AI agent that generates code from a prompt using a selected model.
 * Handles model selection logic and basic error handling.
 *
 * - generateCodeFromPrompt - Public function to invoke the code generation flow.
 * - GenerateCodeFromPromptInput - Input schema for the generation request.
 * - GenerateCodeFromPromptOutput - Output schema for the generation result.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ModelReference } from 'genkit/model'; // Use type import

// Define known model prefixes to help resolve model references and provide better errors
// Only include providers for which plugins *could* be configured (Ollama is dynamic)
const KNOWN_PROVIDER_PREFIXES = ['ollama/', 'googleai/'];

const GenerateCodeFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt describing the application or code to build. Include details like language, framework, file structure, features, and any specific requirements (e.g., "generate unit tests", "use TypeScript", "create a Next.js component").'),
  previousCode: z.string().optional().describe('The code from the previous successful build, if any. This provides context for edits or additions.'),
  modelName: z.string().describe('The fully qualified name of the model to use (e.g., "ollama/llama3", "googleai/gemini-1.5-flash-latest").'),
});
export type GenerateCodeFromPromptInput = z.infer<typeof GenerateCodeFromPromptInputSchema>;

const GenerateCodeFromPromptOutputSchema = z.object({
  code: z.string().describe('The generated code, formatted appropriately (e.g., within ```language ... ``` blocks if specified in prompt or inferred).'),
});
export type GenerateCodeFromPromptOutput = z.infer<typeof GenerateCodeFromPromptOutputSchema>;

// --- Future Enhancements / TODOs ---
// - Implement file tree generation (output multiple files).
// - Add specific agents (Code Assistant, Project Architect) as distinct flows or tools.
// - Integrate long-term memory/context beyond just the last successful code.
// - Add MLOps integration (logging experiment details, performance metrics).
// - Integrate security scanning (e.g., Snyk) results or linters as tools/context.
// - Support multimodal input (images, sketches, sketches).
// - Implement robust validation pipeline (syntax, deps, tests) before returning code.
// - Add Firebase/Cloud deployment integration steps.
// ------------------------------------

/**
 * Generates code based on a user prompt, potentially using previous code as context.
 * This acts as the primary entry point for the code generation feature.
 *
 * @param input - The input containing the prompt, optional previous code, and model name.
 * @returns A promise that resolves to the generated code.
 * @throws Throws an error if model resolution fails or generation encounters an issue.
 */
export async function generateCodeFromPrompt(input: GenerateCodeFromPromptInput): Promise<GenerateCodeFromPromptOutput> {
  // Currently, this directly calls the flow. In a more complex system,
  // it might route to different agents (flows/tools) based on prompt analysis.
  console.log(`Generating code with model: ${input.modelName}`);
  return generateCodeFromPromptFlow(input);
}

// Define the core prompt template for code generation
const prompt = ai.definePrompt({
  name: 'generateCodeFromPromptPrompt',
  input: { schema: GenerateCodeFromPromptInputSchema },
  output: { schema: GenerateCodeFromPromptOutputSchema },
  prompt: `You are an expert AI software developer integrated into an IDE. Your task is to generate high-quality, secure, and maintainable code based *strictly* on the user's prompt and any provided previous code context.

**Instructions:**
1.  **Adhere Strictly to Prompt:** Generate code that directly addresses the user's request. Pay close attention to specified languages, frameworks, file names, project structures, and features (e.g., unit tests, styling).
2.  **Completeness:** Provide complete, runnable code snippets or full application structures as requested. Use standard code formatting (e.g., markdown code blocks with language identifiers like \`\`\`typescript ... \`\`\`).
3.  **Clarity & Best Practices:** Prioritize clear, efficient, and secure coding practices suitable for production environments.
4.  **Context Usage:**
    *   If 'Previous Code' is provided, use it as context for modifications or additions based on the *new* prompt.
    *   If the new prompt is unrelated to the previous code, or if no previous code is given, generate new code from scratch based solely on the prompt.
5.  **Output Format:** Return *only* the generated code within the 'code' field of the output JSON. Do not include explanatory text outside the code itself unless explicitly requested in the prompt.

**User Prompt:**
{{{prompt}}}

{{#if previousCode}}
**Previous Code Context (for modification/reference):**
\`\`\`
{{{previousCode}}}
\`\`\`
{{/if}}

**Generated Code Output:**
`,
});


// Define the Genkit flow that orchestrates the code generation process
const generateCodeFromPromptFlow = ai.defineFlow(
  {
    name: 'generateCodeFromPromptFlow',
    inputSchema: GenerateCodeFromPromptInputSchema,
    outputSchema: GenerateCodeFromPromptOutputSchema,
  },
  async (input) => {
    let modelToUse: ModelReference<any>;

    // --- Model Resolution and Validation ---
    try {
        // Basic check for provider prefix (only check for potentially configurable ones)
        const hasKnownPrefix = KNOWN_PROVIDER_PREFIXES.some(prefix => input.modelName.startsWith(prefix));
        const isOllama = input.modelName.startsWith('ollama/');
        const isOpenRouter = input.modelName.startsWith('openrouter/');
        const isHuggingFace = input.modelName.startsWith('huggingface/');

        // Handle unavailable plugins explicitly due to missing packages
        if (isOpenRouter) {
             throw new Error(`Model provider "openrouter/" is currently unavailable. The @genkit-ai/openrouter package (version 1.8.0) was not found or could not be installed. Please check package availability or choose another provider.`);
        }
        if (isHuggingFace) {
             throw new Error(`Model provider "huggingface/" is currently unavailable. The @genkit-ai/huggingface package (version 1.8.0) was not found or could not be installed. Please check package availability or choose another provider.`);
        }

        // Check format for providers that *could* be configured (Ollama is dynamic but needs prefix)
        if (!hasKnownPrefix && !isOllama) { // Add ollama explicitly here as it's dynamic
            throw new Error(`Invalid model name format: "${input.modelName}". Name must include a known provider prefix (e.g., "ollama/llama3", "googleai/gemini-1.5-flash"). OpenRouter and HuggingFace plugins are currently unavailable.`);
        }

        // Attempt to get the model reference from Genkit
        console.log(`Attempting to resolve model: ${input.modelName}`);
        // Genkit's ai.model() will handle checking availability based on configured plugins.
        // It throws if the model is specified but the corresponding plugin isn't configured or fails.
        // For Ollama, genkitx-ollama needs to be installed and the server running.
        modelToUse = ai.model(input.modelName);
        console.log(`Successfully resolved model: ${input.modelName}`);

    } catch (error: any) {
        console.error(`Error resolving model "${input.modelName}":`, error);
        // Provide a more user-friendly and context-specific error message
        let detailedMessage = `Failed to find or configure the specified model: ${input.modelName}.`;

        if (error.message.includes('provider "openrouter/" is currently unavailable')) {
            detailedMessage = error.message; // Use the specific error thrown above
        } else if (error.message.includes('provider "huggingface/" is currently unavailable')) {
            detailedMessage = error.message; // Use the specific error thrown above
        } else if (input.modelName.startsWith('ollama/')) {
            detailedMessage += ' Ensure the Ollama server is running, accessible, the genkitx-ollama package is installed, and the model is downloaded (check Settings for Base URL).';
        } else if (input.modelName.startsWith('googleai/')) {
            detailedMessage += ' Check Genkit configuration and ensure the GOOGLE_API_KEY is correctly set in Settings/environment.';
        } else {
            detailedMessage += ' Verify the model name and check if the required Genkit plugin is installed and configured correctly. Note: OpenRouter and HuggingFace plugins are currently unavailable due_to missing packages.';
        }
        // Append the original error for more technical detail if available and not redundant
        if (error.message && !detailedMessage.includes(error.message)) {
           detailedMessage += ` Details: ${error.message}`;
        }
        throw new Error(detailedMessage);
    }

    // --- Prepare Prompt Input ---
    // Exclude modelName as it's used in flow options, not the prompt template itself
    const promptInput = {
        prompt: input.prompt,
        previousCode: input.previousCode,
    };

    // --- Execute Prompt ---
    console.log(`Executing prompt with model: ${input.modelName}`);
    // TODO: Add pre-validation step here (e.g., basic prompt sanity check)
    try {
        const { output } = await prompt(promptInput, { model: modelToUse });

        if (!output || typeof output.code !== 'string') {
            // Handle cases where the model returns no output or invalid format
             console.warn("Model returned invalid or empty output structure:", output);
             throw new Error('Received no valid code output from the AI model. This might be due to content filtering, an internal model error, or incorrect output formatting.');
        }

        console.log(`Received output from model ${input.modelName}. Length: ${output.code.length}`);

        // TODO: Implement post-generation validation pipeline here (syntax, linting, etc.) before returning.
        // Example conceptual call:
        // const validationResult = await runValidationPipeline(output.code);
        // if (!validationResult.success) {
        //    throw new Error(`Generated code failed validation: ${validationResult.message}`);
        // }

        // TODO: Potentially post-process the output (e.g., format code, extract files if multiple generated).

        return output;

    } catch (generationError: any) {
        console.error(`Error during prompt execution with model ${input.modelName}:`, generationError);
        // Rethrow with a potentially more context-rich message
        throw new Error(`AI generation failed using model ${input.modelName}. Reason: ${generationError.message || 'Unknown error'}`);
    }
  }
);
