"use client";

import type React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean; // Tracks if the AI generation is in progress
  disabled?: boolean; // Generic disabled state (e.g., while models load or if no model selected)
}

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
  disabled = false,
}: PromptInputProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Submit only if not loading and not generally disabled
    if (!isLoading && !disabled) {
        onSubmit();
    }
  };

  // The button should be disabled if:
  // 1. AI generation is loading (isLoading)
  // 2. The component is generally disabled (disabled)
  // 3. The prompt is empty or only whitespace
  const isButtonDisabled = isLoading || disabled || !prompt.trim();
  // The textarea should be disabled if loading or generally disabled
  const isTextareaDisabled = isLoading || disabled;


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="prompt" className="font-mono text-secondary">Enter your application prompt:</Label>
        <Textarea
          placeholder="Describe the application you want to build... e.g., 'Create a simple React counter component in a file named Counter.tsx'"
          id="prompt"
          value={prompt}
          onChange={handleInputChange}
          rows={5}
          className="text-base font-mono bg-input border-border focus:ring-ring focus:border-accent caret-accent selection:bg-accent/30 disabled:opacity-70 disabled:cursor-not-allowed" // Added disabled styles
          disabled={isTextareaDisabled} // Use derived disabled state
        />
        <p className="text-sm text-muted-foreground font-mono">
          Be specific about files, components, and functionality.
        </p>
      </div>
      <Button
        type="submit"
        disabled={isButtonDisabled} // Use derived disabled state
        className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground font-mono neon-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none" // Retro styling & disabled state
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Code"
        )}
      </Button>
    </form>
  );
}
