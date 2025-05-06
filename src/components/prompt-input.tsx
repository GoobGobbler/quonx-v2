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
  isLoading: boolean;
  disabled?: boolean; // Add disabled prop
}

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
  disabled = false, // Default to false
}: PromptInputProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled) { // Prevent submission if disabled
        onSubmit();
    }
  };

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
          className="text-base font-mono bg-input border-border focus:ring-ring focus:border-accent caret-accent selection:bg-accent/30" // Retro styling
          disabled={isLoading || disabled} // Use disabled prop
        />
        <p className="text-sm text-muted-foreground font-mono">
          Be specific about files, components, and functionality.
        </p>
      </div>
      <Button
        type="submit"
        disabled={isLoading || disabled || !prompt.trim()} // Use disabled prop
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
