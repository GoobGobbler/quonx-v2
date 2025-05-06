'use server';

/**
 * @fileOverview Implements the IncorporateSuccessfulCode flow, allowing the LLM to incorporate code from previous successful builds.
 *
 * - incorporateSuccessfulCode - A function that handles the code incorporation process.
 * - IncorporateSuccessfulCodeInput - The input type for the incorporateSuccessfulCode function.
 * - IncorporateSuccessfulCodeOutput - The return type for the incorporateSuccessfulCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IncorporateSuccessfulCodeInputSchema = z.object({
  prompt: z.string().describe('The prompt for which code needs to be generated.'),
  previousSuccessfulCode: z
    .string()
    .optional()
    .describe('Code from previous successful builds, if available.'),
});
export type IncorporateSuccessfulCodeInput = z.infer<typeof IncorporateSuccessfulCodeInputSchema>;

const IncorporateSuccessfulCodeOutputSchema = z.object({
  generatedCode: z.string().describe('The generated code based on the prompt and previous code.'),
});
export type IncorporateSuccessfulCodeOutput = z.infer<typeof IncorporateSuccessfulCodeOutputSchema>;

export async function incorporateSuccessfulCode(
  input: IncorporateSuccessfulCodeInput
): Promise<IncorporateSuccessfulCodeOutput> {
  return incorporateSuccessfulCodeFlow(input);
}

const generateCodePrompt = ai.definePrompt({
  name: 'generateCodePrompt',
  input: {schema: IncorporateSuccessfulCodeInputSchema},
  output: {schema: IncorporateSuccessfulCodeOutputSchema},
  prompt: `You are an expert software developer who can generate code based on a user's prompt.

  Prompt: {{{prompt}}}

  {{#if previousSuccessfulCode}}
  The following is code from a previous successful build that may be relevant.  Incorporate it as appropriate.
  Previous Code: {{{previousSuccessfulCode}}}
  {{/if}}

  Generate the code according to the prompt. The code should be complete and ready to run.
  `,
});

const incorporateSuccessfulCodeFlow = ai.defineFlow(
  {
    name: 'incorporateSuccessfulCodeFlow',
    inputSchema: IncorporateSuccessfulCodeInputSchema,
    outputSchema: IncorporateSuccessfulCodeOutputSchema,
  },
  async input => {
    const {output} = await generateCodePrompt(input);
    return output!;
  }
);
