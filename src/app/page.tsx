"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, BrainCircuit, X, Pencil } from "lucide-react"; // Added X, Pencil
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button
import { EditPopup } from "@/components/edit-popup"; // Import the new popup component


// Define structure for combined models list
interface CombinedModel {
  id: string; // Fully qualified name (e.g., "ollama/llama3", "googleai/gemini-1.5-flash")
  name: string; // Display name (e.g., "llama3", "Gemini 1.5 Flash")
  provider: 'Ollama' | 'Google AI'; // Only include available providers
  size?: number; // Optional size in bytes (primarily for Ollama)
  description?: string; // Optional description
}

// --- Hardcoded Models (Aligned with genkit.ts) ---
const GOOGLE_AI_MODELS: CombinedModel[] = [
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model' },
  // Add other available configured Gemini models if needed
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

  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);

  // Fetch local Ollama models and combine with Google AI models
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

    // Combine available model sources
    const combined = [
        ...(ollamaError ? [] : localModels), // Only include if no error
        ...GOOGLE_AI_MODELS,
    ];
    setAllModels(combined);

    // Set a default model if none selected and models are available
    if (!selectedModelId && combined.length > 0) {
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        setSelectedModelId(firstGoogle?.id || firstOllama?.id || combined[0].id);
    } else if (selectedModelId && !combined.some(m => m.id === selectedModelId)) {
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        setSelectedModelId(firstGoogle?.id || firstOllama?.id || (combined.length > 0 ? combined[0].id : undefined));
    } else if (combined.length === 0) {
         setSelectedModelId(undefined); // Clear selection if no models found at all
    }

    if (ollamaError && combined.length === 0) {
        setModelError(ollamaError);
    } else if (ollamaError) {
         toast({
            variant: "default",
            title: "Ollama Connection Warning",
            description: `${ollamaError}. Other models are available.`,
            className: "font-mono border-secondary text-secondary", // Terminal style toast
         });
    }

    setIsLoadingModels(false);
  }, [selectedModelId, toast]);

  // Effect to load models on mount
  useEffect(() => {
    fetchAndCombineModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   // Effect to load previous code from localStorage
   useEffect(() => {
    const storedCode = localStorage.getItem('previousSuccessfulCode');
    if (storedCode) {
      setPreviousSuccessfulCode(storedCode);
      // Optionally set generatedCode as well if you want it displayed initially
      // setGeneratedCode(storedCode);
    }
  }, []);

  // Effect to show general model loading error
  useEffect(() => {
      if (modelError && !isLoadingModels && allModels.length === 0) {
          toast({
              variant: "destructive",
              title: "FATAL: No Models Loaded",
              description: modelError,
              className: "font-mono",
          });
      }
  }, [modelError, isLoadingModels, allModels.length, toast]);


  const handleGenerate = async (currentPrompt: string, codeToEdit?: string) => {
     if (!currentPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "ERR: Prompt Empty",
        description: "Input prompt required.",
        className: "font-mono",
      });
      return;
    }
    if (!selectedModelId) {
         toast({
            variant: "destructive",
            title: "ERR: No Model Selected",
            description: "Select generation model.",
            className: "font-mono",
         });
         return;
    }

    setIsLoadingGeneration(true);
    setGenerationError(null);

    try {
      const input: GenerateCodeFromPromptInput = {
        prompt: currentPrompt,
        // If codeToEdit is provided (from edit popup), use it as previousCode
        // Otherwise, use the stored previousSuccessfulCode (for new generation based on history)
        previousCode: codeToEdit ?? previousSuccessfulCode,
        modelName: selectedModelId,
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
        title: "STATUS: Generation OK",
        description: `Model: ${selectedModel?.name || selectedModelId}`,
        className: "font-mono border-primary text-primary",
      });
    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error.";
      setGenerationError(errorMessage);
      toast({
        variant: "destructive",
        title: "ERR: Generation Failed",
        description: errorMessage,
        className: "font-mono",
      });
      // Don't clear code on error during edit, keep the previous state
      // setGeneratedCode("");
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  // Wrapper for initial generation
  const handleInitialGenerate = () => {
      handleGenerate(prompt); // Use the main prompt state
  };

  // Handler for the edit popup submission
  const handleEditSubmit = (editPrompt: string) => {
      if (!generatedCode) {
           toast({ variant: "destructive", title: "ERR: No Code to Edit", description: "Generate code first.", className: "font-mono" });
           return;
      }
      handleGenerate(editPrompt, generatedCode); // Pass the edit prompt and current code
      setIsEditPopupOpen(false); // Close popup after submitting
  };


  const getProviderIcon = (provider: CombinedModel['provider']) => {
      switch (provider) {
          case 'Ollama': return <Server className="h-4 w-4 mr-2 text-secondary" />;
          case 'Google AI': return <BrainCircuit className="h-4 w-4 mr-2 text-primary" />;
          default: return null;
      }
  };

  // Group models by provider for the Select component
  const groupedModels = allModels.reduce((acc, model) => {
      (acc[model.provider] = acc[model.provider] || []).push(model);
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine if the generation button should be disabled
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();
  const isEditDisabled = isLoadingGeneration || !generatedCode; // Disable edit if loading or no code generated


  return (
    // Main container with terminal background and text colors
    <div className="flex flex-col h-screen bg-background text-foreground p-2 md:p-4 border-2 border-border shadow-[inset_0_0_10px_hsla(var(--foreground)/0.1)] rounded-sm">
      {/* Header - Terminal Style */}
      <header className="p-2 border-b-2 border-border mb-2 flex justify-between items-center">
         <div>
            {/* Use chromatic aberration effect and neon color */}
             <h1 className="text-xl md:text-2xl font-bold text-primary font-mono chromatic-aberration-light" data-text="CodeSynth_Terminal//AI-IDE">CodeSynth_Terminal//AI-IDE</h1>
             <p className="text-xs md:text-sm text-muted-foreground font-mono">// AI-Assisted Development Interface v1.0</p>
         </div>
         {/* Optional: Add a blinking cursor or status light */}
          <div className="flex items-center space-x-2">
             <span className="text-xs text-muted-foreground font-mono hidden md:inline">STATUS:</span>
             <div className={`w-3 h-3 rounded-full ${isLoadingGeneration ? 'bg-yellow-500 animate-pulse' : 'bg-primary'}`}></div>
          </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden gap-2 md:gap-4">

        {/* Left Panel: Controls */}
        <div className="w-full md:w-1/3 flex flex-col gap-3 md:gap-4 border border-border p-2 md:p-3 rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] overflow-y-auto">
           {/* Model Selector */}
           <div className="space-y-1">
              <Label htmlFor="model-select" className="text-sm font-medium text-secondary font-mono flex items-center">
                &gt; Select Model_Source:
                 <button onClick={fetchAndCombineModels} disabled={isLoadingModels} className="ml-2 text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed">
                    <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                 </button>
              </Label>
               {isLoadingModels && !allModels.length ? (
                 <Skeleton className="h-10 w-full bg-muted/50 rounded-none border border-muted" />
               ) : modelError && allModels.length === 0 ? (
                   <Alert variant="destructive" className="py-1 px-2 bg-destructive/10 border-destructive/50 text-destructive rounded-none">
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
                    {/* Apply neon-glow and terminal styles */}
                    <SelectTrigger id="model-select" className="w-full bg-input border-border font-mono neon-glow focus:ring-ring focus:border-accent rounded-none text-foreground">
                       <SelectValue placeholder="[Select Model...]" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border font-mono max-h-[400px] overflow-y-auto rounded-none shadow-[0_0_10px_hsla(var(--ring)/0.3)]">
                      {(Object.keys(groupedModels) as Array<keyof typeof groupedModels>).map((provider) => (
                          <SelectGroup key={provider}>
                              <SelectLabel className="text-xs text-muted-foreground flex items-center pl-2 pr-2 py-1 font-mono">
                                  {getProviderIcon(provider as CombinedModel['provider'])}
                                  // {provider}_Models //
                              </SelectLabel>
                              {groupedModels[provider].map((model) => (
                                  <SelectItem
                                     key={model.id}
                                     value={model.id}
                                     // Terminal-style hover/focus
                                     className="cursor-pointer hover:bg-accent/20 focus:bg-accent/30 font-mono pl-8 rounded-none data-[state=checked]:bg-primary/80"
                                  >
                                      <span className="flex items-center justify-between w-full">
                                          <span>{model.name}</span>
                                          {model.size && (
                                            <Badge variant="outline" className="ml-2 text-xs px-1 py-0 border-muted text-muted-foreground bg-transparent rounded-none">
                                                {(model.size / 1e9).toFixed(2)} GB
                                            </Badge>
                                          )}
                                      </span>
                                      {model.description && <p className="text-xs text-muted-foreground mt-1 font-mono">{model.description}</p>}
                                  </SelectItem>
                              ))}
                          </SelectGroup>
                      ))}
                       {allModels.length === 0 && !isLoadingModels && (
                          <SelectItem value="no-models" disabled className="font-mono rounded-none">[No Models Available]</SelectItem>
                       )}
                    </SelectContent>
                 </Select>
               )}
              <p className="text-xs text-muted-foreground font-mono">
                // Ollama requires local server. Cloud models require API keys (server-side).
              </p>
           </div>

           <Separator className="bg-border/50 my-1"/>

           {/* Prompt Input */}
           <div className="flex-grow flex flex-col">
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleInitialGenerate} // Use specific handler for initial generation
              isLoading={isLoadingGeneration}
              disabled={isGenerateDisabled}
              buttonText="Execute_Generation" // Terminal-style button text
              textAreaClass="terminal-input flex-grow" // Ensure textarea grows
            />
           </div>
            {generationError && !isLoadingGeneration && (
                <Alert variant="destructive" className="mt-2 bg-destructive/10 border-destructive/50 text-destructive font-mono rounded-none py-1 px-2">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle className="text-sm">! Execution Error !</AlertTitle>
                  <AlertDescription className="text-xs">{generationError}</AlertDescription>
                </Alert>
            )}
        </div>

        {/* Separator */}
         <Separator orientation="vertical" className="hidden md:block mx-1 h-auto bg-border/30" />
         <Separator orientation="horizontal" className="md:hidden my-1 w-auto bg-border/30" />


        {/* Right Panel: Code Output */}
        <div className="w-full md:w-2/3 flex-grow flex flex-col overflow-hidden border border-border rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)]">
          <CodeDisplay
             code={generatedCode}
             title="// Generated_Output_Buffer //" // Terminal style title
             language="tsx"
             isLoading={isLoadingGeneration}
             containerClassName="flex-grow" // Make code display fill space
          />
          {/* Add Edit Button here */}
          <div className="p-2 border-t border-border flex justify-end">
             <Button
               onClick={() => setIsEditPopupOpen(true)}
               disabled={isEditDisabled}
               className="btn-neon-secondary font-mono text-xs rounded-none px-3 py-1" // Terminal button style
             >
                 <Pencil className="mr-1 h-3 w-3" />
                 Edit_Code...
             </Button>
           </div>
        </div>
      </main>

       {/* Footer - Minimalist Terminal Style */}
       <footer className="pt-1 mt-2 border-t-2 border-border text-center text-xs text-muted-foreground font-mono">
         {/* Use ASCII-like separators */}
         [ CodeSynth Terminal | Genkit | Ollama | Google AI | {new Date().getFullYear()} ]
      </footer>

       {/* Edit Popup Modal */}
       {isEditPopupOpen && (
         <EditPopup
           initialCode={generatedCode}
           onSubmit={handleEditSubmit}
           onClose={() => setIsEditPopupOpen(false)}
           isLoading={isLoadingGeneration}
           selectedModelId={selectedModelId} // Pass model ID for context if needed by popup logic
         />
       )}
    </div>
  );
}
