"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, Cloud, BrainCircuit } from "lucide-react"; // Added more icons
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// Local Ollama client-side fetch (replace if Genkit provides client-side listing)
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";


// Define structure for combined models list
interface CombinedModel {
  id: string; // Fully qualified name (e.g., "ollama/llama3", "googleai/gemini-1.5-flash")
  name: string; // Display name (e.g., "llama3", "Gemini 1.5 Flash")
  provider: 'Ollama' | 'Google AI' | 'OpenRouter' | 'Hugging Face';
  size?: number; // Optional size in bytes (primarily for Ollama)
  description?: string; // Optional description
}

// --- Hardcoded Models (Replace/Augment with dynamic fetching if possible) ---
// These serve as examples and should be aligned with models configured in genkit.ts
const GOOGLE_AI_MODELS: CombinedModel[] = [
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model' },
  // Add other Gemini models as needed
];

const OPENROUTER_MODELS: CombinedModel[] = [
  { id: 'openrouter/auto', name: 'OpenRouter Auto', provider: 'OpenRouter', description: 'Automatic model selection' },
  { id: 'openrouter/anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'OpenRouter', description: 'Anthropic Haiku model via OpenRouter'},
  { id: 'openrouter/google/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (OR)', provider: 'OpenRouter', description: 'Google Gemini Flash via OpenRouter' },
  { id: 'openrouter/mistralai/mistral-large-latest', name: 'Mistral Large (OR)', provider: 'OpenRouter', description: 'Mistral Large via OpenRouter' },
  // Add other popular OpenRouter models
];

const HUGGING_FACE_MODELS: CombinedModel[] = [
    { id: 'huggingface/codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B HF', provider: 'Hugging Face', description: 'Code generation model' },
    { id: 'huggingface/mistralai/Mistral-7B-Instruct-v0.1', name: 'Mistral 7B Instruct', provider: 'Hugging Face', description: 'Instruction-tuned model' },
  // Add other relevant HF models
];
// --- End Hardcoded Models ---


export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [previousSuccessfulCode, setPreviousSuccessfulCode] = useState<string | undefined>(undefined);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const [allModels, setAllModels] = useState<CombinedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // Fetch local Ollama models and combine with others
  const fetchAndCombineModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    let localModels: CombinedModel[] = [];
    let ollamaError: string | null = null;

    try {
        const fetchedOllamaModels = await listLocalOllamaModels();
        localModels = fetchedOllamaModels.map(m => ({
            id: `ollama/${m.name}`, // Prepend 'ollama/' prefix
            name: m.name,
            provider: 'Ollama',
            size: m.size,
            description: `${m.details.family || 'Unknown Family'} (${(m.size / 1e9).toFixed(2)} GB)`
        }));
    } catch (err: any) {
        console.warn("Could not fetch local Ollama models:", err);
        ollamaError = err.message || 'Failed to connect to local Ollama server. Is it running?';
        // Continue without Ollama models
    }

    const combined = [
        ...(ollamaError ? [] : localModels), // Only include if no error
        ...GOOGLE_AI_MODELS,
        ...OPENROUTER_MODELS,
        ...HUGGING_FACE_MODELS,
    ];
    setAllModels(combined);

    // Set a default model if none selected and models are available
    if (!selectedModelId && combined.length > 0) {
        // Prioritize non-local, then local
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOpenRouter = combined.find(m => m.provider === 'OpenRouter');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        setSelectedModelId(firstGoogle?.id || firstOpenRouter?.id || firstOllama?.id || combined[0].id);
    } else if (combined.length === 0) {
         setSelectedModelId(undefined); // Clear selection if no models found at all
    }

    if (ollamaError && combined.length === 0) {
        setModelError(ollamaError); // Show error only if Ollama failed AND no other models exist
    } else if (ollamaError) {
        // Show a less severe warning if Ollama failed but other models are present
         toast({
            variant: "default", // Use default variant for warning
            title: "Ollama Connection Issue",
            description: `${ollamaError}. Other models are available.`,
         });
    }


    setIsLoadingModels(false);
  }, [selectedModelId, toast]); // Depend on selectedModelId

  // Effect to load models on mount
  useEffect(() => {
    fetchAndCombineModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch models only once on mount

   // Effect to load previous code from localStorage
   useEffect(() => {
    const storedCode = localStorage.getItem('previousSuccessfulCode');
    if (storedCode) {
      setPreviousSuccessfulCode(storedCode);
    }
  }, []);

  // Effect to show general model loading error (if no models loaded at all)
  useEffect(() => {
      if (modelError && !isLoadingModels && allModels.length === 0) {
          toast({
              variant: "destructive",
              title: "Failed to load any models",
              description: modelError,
          });
      }
  }, [modelError, isLoadingModels, allModels.length, toast]);


  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt is empty",
        description: "Please enter a prompt.",
      });
      return;
    }
    if (!selectedModelId) {
         toast({
            variant: "destructive",
            title: "No model selected",
            description: "Please select a model.",
         });
         return;
    }

    setIsLoadingGeneration(true);
    setGenerationError(null);

    try {
      const input: GenerateCodeFromPromptInput = {
        prompt,
        previousCode: previousSuccessfulCode,
        modelName: selectedModelId, // Pass the fully qualified model ID
      };
      const result = await generateCodeFromPrompt(input);
      setGeneratedCode(result.code);

      // Store successful code
      setPreviousSuccessfulCode(result.code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('previousSuccessfulCode', result.code);
      }

       const selectedModel = allModels.find(m => m.id === selectedModelId);
      toast({
        title: "Code Generation Successful",
        description: `Generated using ${selectedModel?.name || selectedModelId} (${selectedModel?.provider || 'Unknown Provider'}).`,
      });
    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setGenerationError(errorMessage);
      toast({
        variant: "destructive",
        title: "Code Generation Failed",
        description: errorMessage,
      });
      setGeneratedCode(""); // Clear code on error
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  const getProviderIcon = (provider: CombinedModel['provider']) => {
      switch (provider) {
          case 'Ollama': return <Server className="h-4 w-4 mr-2 text-blue-500" />;
          case 'Google AI': return <BrainCircuit className="h-4 w-4 mr-2 text-green-500" />;
          case 'OpenRouter': return <Cloud className="h-4 w-4 mr-2 text-purple-500" />;
          case 'Hugging Face': return <Cloud className="h-4 w-4 mr-2 text-yellow-500" />; // Or a different HF icon
          default: return null;
      }
  };

  const groupedModels = allModels.reduce((acc, model) => {
      (acc[model.provider] = acc[model.provider] || []).push(model);
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine if the generation button should be disabled
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border bg-card shadow-md">
         {/* Apply typewriter font style if not globally applied */}
         <h1 className="text-3xl font-bold text-primary font-mono chromatic-aberration" data-text="AIAgent - Retro IDE">AIAgent - Retro IDE</h1>
         <p className="text-sm text-muted-foreground font-mono">Develop applications with AI assistance (60s/70s Edition)</p>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-6">
        {/* Left Side: Prompt Input & Model Selection */}
        <div className="lg:w-1/3 flex flex-col gap-4">
           {/* Model Selector */}
           <div className="space-y-2">
              <Label htmlFor="model-select" className="text-sm font-medium text-secondary font-mono flex items-center">
                Select AI Model:
                 <button onClick={fetchAndCombineModels} disabled={isLoadingModels} className="ml-2 text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed">
                    <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                 </button>
              </Label>
               {isLoadingModels && !allModels.length ? ( // Show skeleton only on initial load
                 <Skeleton className="h-10 w-full" />
               ) : modelError && allModels.length === 0 ? ( // Show error only if loading failed AND no models listed
                   <Alert variant="destructive" className="py-2 px-3">
                      <Terminal className="h-4 w-4" />
                      <AlertDescription className="text-xs">{modelError}
                         <button onClick={fetchAndCombineModels} className="underline ml-1">(Retry)</button>
                      </AlertDescription>
                   </Alert>
               ) : (
                 <Select
                   value={selectedModelId ?? ""}
                   onValueChange={(value) => setSelectedModelId(value || undefined)}
                   disabled={isLoadingModels || allModels.length === 0}
                 >
                    <SelectTrigger id="model-select" className="w-full bg-input border-border font-mono neon-accent focus:ring-ring">
                       <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border font-mono max-h-[400px] overflow-y-auto">
                      {Object.entries(groupedModels).map(([provider, models]) => (
                          <SelectGroup key={provider}>
                              <SelectLabel className="text-xs text-muted-foreground flex items-center">
                                  {getProviderIcon(provider as CombinedModel['provider'])}
                                  {provider}
                              </SelectLabel>
                              {models.map((model) => (
                                  <SelectItem key={model.id} value={model.id} className="cursor-pointer hover:bg-accent focus:bg-accent">
                                      <span className="flex items-center justify-between w-full">
                                          <span>{model.name}</span>
                                          {model.size && (
                                            <Badge variant="outline" className="ml-2 text-xs px-1 py-0">
                                                {(model.size / 1e9).toFixed(2)} GB
                                            </Badge>
                                          )}
                                      </span>
                                      {model.description && <p className="text-xs text-muted-foreground mt-1">{model.description}</p>}
                                  </SelectItem>
                              ))}
                          </SelectGroup>
                      ))}
                       {allModels.length === 0 && !isLoadingModels && (
                          <SelectItem value="no-models" disabled>No models found or loaded</SelectItem>
                       )}
                    </SelectContent>
                 </Select>
               )}
              <p className="text-xs text-muted-foreground font-mono">
                Select a model provider. Ensure Ollama is running for local models. Add API keys in settings (TBD) for cloud models.
              </p>
           </div>

           <Separator className="bg-border"/>

           {/* Prompt Input */}
           <div className="flex-shrink-0">
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleGenerateCode}
              isLoading={isLoadingGeneration} // Pass generation loading state
              disabled={isGenerateDisabled} // Use combined disabled state
            />
           </div>
            {generationError && !isLoadingGeneration && ( // Only show generation error if not loading
                <Alert variant="destructive" className="mt-4 bg-destructive/10 border-destructive/50 text-destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error Generating Code</AlertTitle>
                  <AlertDescription>{generationError}</AlertDescription>
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
             isLoading={isLoadingGeneration} // Pass generation loading state
           />
           {/* Future IDE features might go here */}
        </div>
      </main>

      <footer className="p-2 border-t border-border text-center text-xs text-muted-foreground bg-card/80 font-mono">
         Powered by Genkit, Ollama, OpenRouter, Hugging Face &amp; Google AI - Retro Edition © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
