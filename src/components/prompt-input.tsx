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
}

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
}: PromptInputProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="prompt">Enter your application prompt:</Label>
        <Textarea
          placeholder="Describe the application you want to build..."
          id="prompt"
          value={prompt}
          onChange={handleInputChange}
          rows={5}
          className="text-base"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Be as detailed as possible for the best results.
        </p>
      </div>
      <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground">
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
