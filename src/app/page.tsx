"use client";

import React, { useState, useEffect } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [previousSuccessfulCode, setPreviousSuccessfulCode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Effect to prevent hydration mismatch issues with localStorage
  useEffect(() => {
      const storedCode = localStorage.getItem('previousSuccessfulCode');
      if (storedCode) {
          setPreviousSuccessfulCode(storedCode);
      }
  }, []);


  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a prompt describing the application.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: GenerateCodeFromPromptInput = {
        prompt,
        previousCode: previousSuccessfulCode,
      };
      const result = await generateCodeFromPrompt(input);
      setGeneratedCode(result.code);

      // Store successful code for potential future use
      setPreviousSuccessfulCode(result.code);
       // Store in localStorage only on client-side after generation
      if (typeof window !== 'undefined') {
        localStorage.setItem('previousSuccessfulCode', result.code);
      }

      toast({
        title: "Code Generation Successful",
        description: "The AI has generated the code based on your prompt.",
      });
    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during code generation.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Code Generation Failed",
        description: errorMessage,
      });
      setGeneratedCode(""); // Clear previous code on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b bg-card">
        <h1 className="text-2xl font-bold text-primary">AI Agent</h1>
        <p className="text-sm text-muted-foreground">Develop applications with AI assistance</p>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Left Side: Prompt Input */}
        <div className="lg:w-1/3 flex flex-col gap-4">
           <div className="flex-shrink-0">
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleGenerateCode}
              isLoading={isLoading}
            />
           </div>
            {error && (
                <Alert variant="destructive" className="mt-4">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error Generating Code</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>

        <Separator orientation="vertical" className="hidden lg:block mx-2 h-auto" />
        <Separator orientation="horizontal" className="lg:hidden my-2 w-auto" />


        {/* Right Side: Code Display */}
        <div className="lg:w-2/3 flex-grow overflow-hidden">
          <CodeDisplay code={generatedCode} title="Generated Application Code"/>
        </div>
      </main>

      <footer className="p-2 border-t text-center text-xs text-muted-foreground bg-card">
        Powered by Local AI Agent - © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
