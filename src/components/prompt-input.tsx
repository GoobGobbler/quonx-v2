"use client";

import type React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean; // Tracks if the AI generation is in progress
  disabled?: boolean; // Generic disabled state
  buttonText?: string; // Custom button text
  textAreaClass?: string; // Allow passing class to textarea
}

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
  disabled = false,
  buttonText = "Generate Code", // Default button text
  textAreaClass
}: PromptInputProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoading && !disabled) {
        onSubmit();
    }
  };

  const isButtonDisabled = isLoading || disabled || !prompt.trim();
  const isTextareaDisabled = isLoading || disabled;


  return (
    <form onSubmit={handleSubmit} className="space-y-3 flex flex-col h-full">
      <div className="grid w-full gap-1.5 flex-grow">
        <Label htmlFor="prompt" className="font-mono text-secondary text-sm">
            &gt; Input_Prompt:
        </Label>
        <Textarea
          placeholder="// Enter prompt: Describe application, file structure, features..."
          id="prompt"
          value={prompt}
          onChange={handleInputChange}
          // Use flex-grow to make textarea fill available space
          className={cn(
              "text-sm font-mono bg-input border border-border focus:ring-1 focus:ring-ring focus:border-accent caret-accent selection:bg-accent/30 disabled:opacity-70 disabled:cursor-not-allowed rounded-none resize-none flex-grow terminal-input", // Apply terminal styles
              textAreaClass // Apply passed classes
              )}
          disabled={isTextareaDisabled}
          rows={5} // Initial rows, but flex-grow handles height
        />
        <p className="text-xs text-muted-foreground font-mono">
          // Use specific instructions for files, components, languages.
        </p>
      </div>
      <Button
        type="submit"
        disabled={isButtonDisabled}
        // Apply neon button style and terminal look
        className="w-full sm:w-auto btn-neon font-mono text-sm rounded-none px-4 py-1.5 mt-auto" // mt-auto pushes button down in flex container
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText // Use the buttonText prop
        )}
      </Button>
    </form>
  );
}
