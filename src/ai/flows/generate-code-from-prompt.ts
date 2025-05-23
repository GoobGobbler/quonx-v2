
'use server';
/**
 * @fileOverview An AI agent that generates code from a prompt using a selected model.
 * Handles model selection logic and basic error handling.
 * Now supports generating multiple files for a project structure.
 *
 * - generateCodeFromPrompt - Public function to invoke the code generation flow.
 * - GenerateCodeFromPromptInput - Input schema for the generation request.
 * - GenerateCodeFromPromptOutput - Output schema for the generation result (can be multiple files).
 * - FileObject - Represents a single generated file with its path and content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ModelReference } from 'genkit/model'; // Use type import

// Define known model prefixes to help resolve model references and provide better errors
// Only include providers for which plugins *could* be configured (Ollama is dynamic)
const KNOWN_PROVIDER_PREFIXES = ['ollama/', 'googleai/']; // OpenRouter and HuggingFace are handled as unavailable

const GenerateCodeFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt describing the application or code to build. Include details like language, framework, desired file structure (e.g., "a Next.js component named MyButton.tsx and its CSS module MyButton.module.css"), features, and any specific requirements (e.g., "generate unit tests", "use TypeScript"). For multi-file projects, clearly state the desired files and their paths.'),
  previousCode: z.string().optional().describe('The content of the currently active file or a relevant code snippet from a previous successful build, if any. This provides context for edits or additions. For multi-file generation, this might be less relevant unless editing a specific file.'),
  modelName: z.string().describe('The fully qualified name of the model to use (e.g., "ollama/llama3", "googleai/gemini-1.5-flash-latest").'),
});
export type GenerateCodeFromPromptInput = z.infer<typeof GenerateCodeFromPromptInputSchema>;

const FileObjectSchema = z.object({
  filePath: z.string().describe("The full path of the generated file, including the filename and extension (e.g., 'src/components/Button.tsx', 'public/styles/main.css'). Ensure correct casing and extensions."),
  content: z.string().describe("The complete content of the generated file."),
});
export type FileObject = z.infer<typeof FileObjectSchema>;

const GenerateCodeFromPromptOutputSchema = z.object({
  files: z.array(FileObjectSchema).describe('An array of file objects, each representing a generated file with its path and content. If the prompt asks for a single snippet or file, this array will contain one element.'),
});
export type GenerateCodeFromPromptOutput = z.infer<typeof GenerateCodeFromPromptOutputSchema>;


// --- Future Enhancements / TODOs ---
// - Implement robust file tree generation logic (deeper validation, specific interactions for file explorer).
// - Add specific agents (Code Assistant, Project Architect, Security Analyst, Firebase Expert) as distinct flows or tools with tailored prompts and capabilities.
// - Integrate long-term memory/context beyond just the last successful code (e.g., using a vector database for project context).
// - Add MLOps integration (logging experiment details, performance metrics, model versioning for generated code).
// - Integrate security scanning (e.g., Snyk, OWASP ZAP) results or linters as tools/context.
// - Support multimodal input (images for UI scaffolding, sketches for diagrams, voice for prompts).
// - Implement robust validation pipeline (syntax checks, dependency resolution, headless compile/run tests, linting) before returning code.
// - Add Firebase/Cloud deployment integration steps (e.g., generating deployment scripts, interacting with Firebase CLI or Google Cloud SDKs).
// - Add advanced debugging and profiling tool integration placeholders.
// - Plugin marketplace and SDK conceptual placeholders.
// ------------------------------------

/**
 * Generates code based on a user prompt, potentially using previous code as context.
 * This acts as the primary entry point for the code generation feature.
 * It can generate single or multiple files.
 *
 * @param input - The input containing the prompt, optional previous code, and model name.
 * @returns A promise that resolves to an object containing an array of generated file objects.
 * @throws Throws an error if model resolution fails or generation encounters an issue.
 */
export async function generateCodeFromPrompt(input: GenerateCodeFromPromptInput): Promise<GenerateCodeFromPromptOutput> {
  console.log(`Generating code with model: ${input.modelName}. Prompt: "${input.prompt.substring(0,100)}..."`);
  // TODO: Add MLOps logging for experiment tracking (input prompt, model, settings, output hash/summary)
  return generateCodeFromPromptFlow(input);
}

// Define the core prompt template for code generation
const prompt = ai.definePrompt({
  name: 'generateCodeFromPromptPrompt',
  input: { schema: GenerateCodeFromPromptInputSchema },
  output: { schema: GenerateCodeFromPromptOutputSchema },
  prompt: `You are an expert AI software developer integrated into an IDE. Your task is to generate high-quality, secure, and maintainable code based *strictly* on the user's prompt and any provided previous code context.

**Instructions:**
1.  **Adhere Strictly to Prompt:** Generate code that directly addresses the user's request. Pay close attention to specified languages, frameworks, file names, project structures, and features (e.g., unit tests, styling, security considerations).
2.  **File Structure (Critical):**
    *   If the prompt implies a project structure or multiple files (e.g., "create a React component with a CSS module", "scaffold a Node.js Express API with routes and models", "a Next.js page at 'app/dashboard/page.tsx' and its layout 'app/dashboard/layout.tsx'"), you MUST generate ALL necessary files.
    *   Each file MUST be returned as an object with "filePath" (e.g., "src/components/MyComponent.tsx", "app/api/users/route.ts") and "content" (the full file content). Ensure filePaths are accurate and include correct extensions.
    *   If the prompt is for a single snippet or modification to existing code, return a single file object, using a relevant filePath (e.g., "snippet.txt" or the original file's path if editing).
3.  **Completeness:** Provide complete, runnable code where appropriate. Use standard code formatting. Include necessary imports, exports, and basic boilerplate.
4.  **Clarity & Best Practices:** Prioritize clear, efficient, and secure coding practices suitable for production environments. Add comments for complex logic if helpful.
5.  **Context Usage (Previous Code):**
    *   If 'Previous Code' is provided, it represents the content of the *currently active file* or a relevant snippet. Use it as context for modifications or additions specific to *that file/context* if the prompt implies an edit.
    *   If the prompt asks for a new project or files unrelated to the previous code, or if no previous code is given, generate new code/files from scratch based solely on the prompt.
6.  **Output Format (Strict):** Return *ONLY* a JSON object matching the output schema, containing a "files" array. Each element in "files" must be an object with "filePath" and "content". Do not include any explanatory text, markdown formatting, or any other text outside the JSON structure itself.

**User Prompt:**
{{{prompt}}}

{{#if previousCode}}
**Previous Code Context (for modification/reference, likely the active file):**
\`\`\`
{{{previousCode}}}
\`\`\`
{{/if}}

**Generated Output (JSON structure with "files" array):**
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
        const hasKnownPrefix = KNOWN_PROVIDER_PREFIXES.some(prefix => input.modelName.startsWith(prefix));
        const isOllama = input.modelName.startsWith('ollama/');
        const isOpenRouter = input.modelName.startsWith('openrouter/'); // Check for OpenRouter
        const isHuggingFace = input.modelName.startsWith('huggingface/'); // Check for HuggingFace

        // Handle unavailable plugins explicitly due to missing packages
        if (isOpenRouter) { // Using actual package names for this check
             throw new Error(`Model provider "openrouter/" is currently unavailable. The @genkit-ai/openrouter package (version 1.8.0) was not found or could not be installed. Please check package availability or choose another provider.`);
        }
        if (isHuggingFace) { // Using actual package names for this check
             throw new Error(`Model provider "huggingface/" is currently unavailable. The @genkit-ai/huggingface package (version 1.8.0) was not found or could not be installed. Please check package availability or choose another provider.`);
        }

        if (!hasKnownPrefix && !isOllama) {
            throw new Error(`Invalid model name format: "${input.modelName}". Name must include a known provider prefix (e.g., "ollama/llama3", "googleai/gemini-1.5-flash"). OpenRouter and HuggingFace plugins are currently unavailable.`);
        }

        console.log(`Attempting to resolve model: ${input.modelName}`);
        modelToUse = ai.model(input.modelName);
        console.log(`Successfully resolved model: ${input.modelName}`);

    } catch (error: any) {
        console.error(`Error resolving model "${input.modelName}":`, error);
        let detailedMessage = `Failed to find or configure the specified model: ${input.modelName}.`;

        if (error.message.includes('provider "openrouter/" is currently unavailable')) { // Specific message for OpenRouter
            detailedMessage = error.message;
        } else if (error.message.includes('provider "huggingface/" is currently unavailable')) { // Specific message for HuggingFace
            detailedMessage = error.message;
        } else if (input.modelName.startsWith('ollama/')) {
            detailedMessage += ' Ensure the Ollama server is running, accessible, the genkitx-ollama package is installed, and the model is downloaded (check Settings for Base URL).';
        } else if (input.modelName.startsWith('googleai/')) {
            detailedMessage += ' Check Genkit configuration and ensure the GOOGLE_API_KEY is correctly set in Settings/environment.';
        } else {
            detailedMessage += ' Verify the model name and check if the required Genkit plugin is installed and configured correctly. Note: OpenRouter and HuggingFace plugins are currently unavailable due to missing packages.';
        }
        if (error.message && !detailedMessage.includes(error.message)) {
           detailedMessage += ` Details: ${error.message}`;
        }
        throw new Error(detailedMessage);
    }

    // --- Prepare Prompt Input ---
    const promptInput = {
        prompt: input.prompt,
        previousCode: input.previousCode,
        // TODO: Add long-term context/memory here if implemented
        // projectContext: await getProjectContextSummary(input.projectId), // Example
    };

    // --- Execute Prompt ---
    console.log(`Executing prompt with model: ${input.modelName}`);
    try {
        const { output } = await prompt(promptInput, { model: modelToUse });

        if (!output || !Array.isArray(output.files) || output.files.length === 0) {
             console.warn("Model returned invalid, empty, or no 'files' array in output structure:", output);
             // Try to parse if output itself is a string that might be a JSON array
             if (typeof output === 'string') {
                try {
                    const parsedOutput = JSON.parse(output as string);
                    if (parsedOutput && Array.isArray(parsedOutput.files) && parsedOutput.files.length > 0) {
                        console.log("Successfully parsed string output into valid structure.");
                        return parsedOutput as GenerateCodeFromPromptOutput;
                    }
                } catch (e) {
                    // Parsing failed, fall through to error
                }
             }
             throw new Error('Received no valid file outputs from the AI model. Ensure the model is capable of and instructed to return a JSON object with a "files" array, each containing "filePath" and "content". This might also be due to content filtering or an internal model error.');
        }
        
        // Validate each file object
        for (const file of output.files) {
            if (typeof file.filePath !== 'string' || typeof file.content !== 'string') {
                console.warn("Invalid file object in output:", file, "Full output:", output);
                throw new Error('Received invalid file object structure from the AI model. Each file must have "filePath" and "content" strings.');
            }
        }

        console.log(`Received ${output.files.length} file(s) from model ${input.modelName}. First file path: ${output.files[0]?.filePath}`);
        
        // TODO: Implement post-generation validation pipeline here (syntax, linting, security, tests) before returning.
        // For example:
        // const validationResults = await Promise.all(output.files.map(file => 
        //   runValidationPipeline(file.content, { language: file.filePath.split('.').pop(), filePath: file.filePath })
        // ));
        // const failedValidations = validationResults.filter(r => !r.success);
        // if (failedValidations.length > 0) {
        //   throw new Error(`Generated code failed validation: ${failedValidations.map(f => `${f.filePath}: ${f.message}`).join(', ')}`);
        // }

        // TODO: Add MLOps logging for successful generation (e.g., output summary, tokens used if available)
        return output as GenerateCodeFromPromptOutput; // Ensure type cast if direct assignment

    } catch (generationError: any) {
        console.error(`Error during prompt execution with model ${input.modelName}:`, generationError);
        // TODO: Add MLOps logging for failed generation
        throw new Error(`AI generation failed using model ${input.modelName}. Reason: ${generationError.message || 'Unknown error'}`);
    }
  }
);

// Placeholder for multimodal input processing - this would likely be a separate flow or integrated tool
// async function processMultimodalInput(input: { text?: string; imageDataUri?: string; sketchDataUri?: string }) {
//   // Logic to handle image/sketch data, possibly by passing it to a vision-capable model
//   // or by using a tool to analyze the image and convert it to a text description for the main LLM.
//   let combinedPrompt = input.text || "";
//   if (input.imageDataUri) {
//     // Example: combinedPrompt += `\n\nImage context: {{media url=${input.imageDataUri}}}`;
//     // Or use a vision model to get a description of the image first.
//   }
//   return combinedPrompt;
// }

// Placeholder for robust validation pipeline
// async function runValidationPipeline(code: string, options: { language?: string, filePath?: string }): Promise<{success: boolean; message?: string; filePath?: string}> {
//   // 1. Syntax Check (e.g., using a parser or lightweight linter)
//   // 2. Dependency Resolution (conceptual for now, could involve checking import statements)
//   // 3. Security Scan (e.g., regex for common vulnerabilities, or integrate a lightweight scanner tool)
//   // 4. Headless Compile/Run Tests (if test generation is also implemented and tests are provided/generated)
//   console.log(`Validating ${options.filePath || 'code snippet'} for language ${options.language || 'unknown'}...`);
//   // Simulate validation success
//   return { success: true, filePath: options.filePath };
// }
