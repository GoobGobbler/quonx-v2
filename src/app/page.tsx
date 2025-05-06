"use client";

import React, { useState, useEffect } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react"; // Removed ChevronDown as it wasn't used
import { type OllamaModel } from "@/ai/services/ollama"; // Import Ollama type only
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select component
import { Label } from "@/components/ui/label"; // Import Label
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useOllamaContext } from "@/context/ollama-provider"; // Import context hook

export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [previousSuccessfulCode, setPreviousSuccessfulCode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use context for models and selection
  const {
      models,
      selectedModel,
      setSelectedModel,
      isLoading: isLoadingModels,
      error: modelError,
      refreshModels
  } = useOllamaContext();


  // Effect to load previous code from localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem('previousSuccessfulCode');
    if (storedCode) {
      setPreviousSuccessfulCode(storedCode);
    }
  }, []);

  // Effect to show model loading error
  useEffect(() => {
      if (modelError) {
          toast({
              variant: "destructive",
              title: "Failed to load Ollama models",
              description: modelError,
          });
      }
  }, [modelError, toast]);


  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a prompt describing the application.",
      });
      return;
    }
    if (!selectedModel) {
         toast({
            variant: "destructive",
            title: "No model selected",
            description: "Please select an Ollama model.",
         });
         return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: GenerateCodeFromPromptInput = {
        prompt,
        previousCode: previousSuccessfulCode,
        ollamaModel: selectedModel, // Pass selected model
      };
      const result = await generateCodeFromPrompt(input);
      setGeneratedCode(result.code);

      // Store successful code for potential future use
      setPreviousSuccessfulCode(result.code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('previousSuccessfulCode', result.code);
      }

      toast({
        title: "Code Generation Successful",
        description: `Generated using ${selectedModel}.`, // Include model name in toast
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

  // Determine if the generation button should be disabled
  const isGenerateDisabled = isLoading || isLoadingModels || !selectedModel || !prompt.trim();


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border bg-card shadow-md">
        {/* Apply typewriter font style if not globally applied */}
        <h1 className="text-3xl font-bold text-primary font-mono">AIAgent - Retro IDE</h1>
        <p className="text-sm text-muted-foreground font-mono">Develop applications with AI assistance (60s/70s Edition)</p>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-6">
        {/* Left Side: Prompt Input & Model Selection */}
        <div className="lg:w-1/3 flex flex-col gap-4">
           {/* Model Selector */}
           <div className="space-y-2">
              <Label htmlFor="ollama-model-select" className="text-sm font-medium text-secondary font-mono">Select Ollama Model:</Label>
               {isLoadingModels ? (
                 <Skeleton className="h-10 w-full" />
               ) : modelError ? (
                   <Alert variant="destructive" className="py-2 px-3">
                      <Terminal className="h-4 w-4" />
                      <AlertDescription className="text-xs">{modelError} <button onClick={refreshModels} className="underline ml-1">(Retry)</button></AlertDescription>
                   </Alert>
               ) : (
                 <Select
                   value={selectedModel ?? ""}
                   onValueChange={(value) => setSelectedModel(value || undefined)}
                   disabled={isLoadingModels || models.length === 0}
                 >
                    <SelectTrigger id="ollama-model-select" className="w-full bg-input border-border font-mono neon-accent focus:ring-ring">
                       <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border font-mono">
                       {models.length > 0 ? (
                          models.map((model: OllamaModel) => (
                          <SelectItem key={model.name} value={model.name} className="cursor-pointer hover:bg-accent focus:bg-accent">
                             {model.name} <span className="text-xs text-muted-foreground ml-2">({(model.size / 1e9).toFixed(2)} GB)</span>
                          </SelectItem>
                          ))
                       ) : (
                          <SelectItem value="no-models" disabled>No models found</SelectItem>
                       )}
                    </SelectContent>
                 </Select>
               )}
              <p className="text-xs text-muted-foreground font-mono">Ensure Ollama is running locally and models are downloaded.</p>
           </div>

           <Separator className="bg-border"/>

           {/* Prompt Input */}
           <div className="flex-shrink-0">
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleGenerateCode}
              isLoading={isLoading} // Pass only generation loading state
              disabled={isGenerateDisabled} // Use combined disabled state
            />
           </div>
            {error && !isLoading && ( // Only show error if not loading
                <Alert variant="destructive" className="mt-4 bg-destructive/10 border-destructive/50 text-destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error Generating Code</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>

        {/* Vertical Separator */}
        <Separator orientation="vertical" className="hidden lg:block mx-2 h-auto bg-border/50" />
        {/* Horizontal Separator for mobile */}
        <Separator orientation="horizontal" className="lg:hidden my-2 w-auto bg-border/50" />


        {/* Right Side: Code Display */}
        <div className="lg:w-2/3 flex-grow flex flex-col overflow-hidden border border-border rounded-lg shadow-inner bg-card">
           <CodeDisplay
             code={generatedCode}
             title="Generated Code Output"
             language="tsx" // Default to tsx for React/Next.js context
             isLoading={isLoading} // Pass loading state to CodeDisplay
           />
           {/* Future IDE features might go here */}
        </div>
      </main>

      <footer className="p-2 border-t border-border text-center text-xs text-muted-foreground bg-card/80 font-mono">
        Powered by Genkit &amp; Ollama - Retro Edition © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
