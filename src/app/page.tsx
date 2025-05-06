"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, BrainCircuit, X, Pencil, Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info } from "lucide-react"; // Added Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPopup } from "@/components/edit-popup";
import { SettingsPanel } from "@/components/settings-panel"; // Import SettingsPanel


// Define structure for combined models list
interface CombinedModel {
  id: string; // Fully qualified name (e.g., "ollama/llama3", "googleai/gemini-1.5-flash")
  name: string; // Display name (e.g., "llama3", "Gemini 1.5 Flash")
  provider: 'Ollama' | 'Google AI'; // Expand this as more providers are *actually* configured in genkit.ts
  size?: number; // Optional size in bytes (primarily for Ollama)
  description?: string; // Optional description
}

// --- Hardcoded Models (Aligned with genkit.ts configuration) ---
// Only include models from providers that are actually configured with API keys in src/ai/genkit.ts
const CONFIGURED_CLOUD_MODELS: CombinedModel[] = [
  // Google AI / Gemini Models (Requires GOOGLE_API_KEY)
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model' },

  // Add OpenRouter models here if configured in genkit.ts (Requires OPENROUTER_API_KEY)
  // { id: 'openrouter/anthropic/claude-3-haiku', name: 'Claude 3 Haiku (OpenRouter)', provider: 'OpenRouter', description: 'Fast, affordable model' },
  // { id: 'openrouter/google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (OpenRouter)', provider: 'OpenRouter', description: 'Fast, versatile model via OR' },

  // Add Hugging Face models here if configured in genkit.ts (Requires HF_API_KEY)
  // { id: 'huggingface/codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B (HF)', provider: 'Hugging Face', description: 'Code-focused model' },
];
// --- End Hardcoded Models ---

// Conceptual Validation Pipeline Function (Placeholder)
async function runValidationPipeline(code: string, prompt?: string): Promise<{ success: boolean; message?: string }> {
    console.log("Running conceptual validation pipeline...", { codeLength: code.length, prompt });
    // In a real implementation, this would involve:
    // 1. Syntax checking (e.g., using a parser like esprima or babel)
    // 2. Linting (e.g., using ESLint programmatically)
    // 3. Type checking (e.g., using TypeScript compiler API)
    // 4. Dependency analysis (checking imports)
    // 5. Basic security checks (simple regex for common issues)
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async work
    // Simulate occasional failure for demonstration
    // const success = Math.random() > 0.1;
    // For now, always return success
    const success = true;
    return { success: success, message: success ? "Validation passed" : "Conceptual validation failed: Syntax error detected." };
}


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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State for settings panel
  const [validationStatus, setValidationStatus] = useState<string>("Idle"); // State for validation status

  // Fetch local Ollama models and combine with configured cloud models
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
    }

    // Combine available model sources
    const combined = [
        ...(ollamaError ? [] : localModels), // Only include Ollama if no error
        ...CONFIGURED_CLOUD_MODELS, // Include *only* configured cloud models
    ];
    setAllModels(combined);

    // Set a default model intelligently
    if (!selectedModelId && combined.length > 0) {
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        // Prioritize Google, then Ollama, then first available
        setSelectedModelId(firstGoogle?.id || firstOllama?.id || combined[0].id);
    } else if (selectedModelId && !combined.some(m => m.id === selectedModelId)) {
        // If current selection is no longer valid, reset default
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        setSelectedModelId(firstGoogle?.id || firstOllama?.id || (combined.length > 0 ? combined[0].id : undefined));
    } else if (combined.length === 0) {
         setSelectedModelId(undefined); // No models found
    }

    // Handle errors/warnings
    if (ollamaError && combined.length === CONFIGURED_CLOUD_MODELS.length) {
        // Only Ollama failed, show warning toast if cloud models are still available
        toast({
            variant: "default", // Use default (less alarming) style for warning
            title: "Ollama Connection Warning",
            description: `${ollamaError}. Cloud models are available.`,
            className: "font-mono border-secondary text-secondary",
        });
    } else if (ollamaError && combined.length === 0) {
        // All models failed (Ollama error and no cloud models configured/available)
        setModelError(ollamaError); // Set state to display persistent error
    } else if (combined.length === 0 && !ollamaError) {
        // No Ollama error, but no cloud models configured/available either
        setModelError("No AI models available. Please configure cloud providers (Google AI, etc.) in src/ai/genkit.ts with API keys, or ensure the Ollama server is running.");
    }


    setIsLoadingModels(false);
  }, [selectedModelId, toast]); // Dependency includes selectedModelId to handle re-selection logic

  // Effect to load models on mount
  useEffect(() => {
    fetchAndCombineModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

   // Effect to load previous code from localStorage
   useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem('previousSuccessfulCode');
        if (storedCode) {
            setPreviousSuccessfulCode(storedCode);
            // Optionally set generatedCode as well if you want it displayed initially
            // setGeneratedCode(storedCode);
        }
    }
   }, []); // Run only once on mount

  // Effect to show persistent model loading error if necessary
  useEffect(() => {
      if (modelError && !isLoadingModels && allModels.length === 0) {
          toast({
              variant: "destructive",
              title: "FATAL: No Models Available",
              description: modelError,
              className: "font-mono",
              duration: Infinity, // Keep persistent until manually dismissed or resolved
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
    setValidationStatus("Running Pre-Validation...");

    // Run pre-generation validation pipeline
    const preValidationResult = await runValidationPipeline(codeToEdit ?? '', currentPrompt);
    if (!preValidationResult.success) {
        setValidationStatus(`Failed: ${preValidationResult.message}`);
        setGenerationError(`Pre-generation validation failed: ${preValidationResult.message}`);
        toast({
            variant: "destructive",
            title: "ERR: Pre-Validation Failed",
            description: preValidationResult.message,
            className: "font-mono",
        });
        setIsLoadingGeneration(false);
        return;
    }
    setValidationStatus("Pre-Validation Passed");

    try {
      const input: GenerateCodeFromPromptInput = {
        prompt: currentPrompt,
        // Use codeToEdit if provided (from edit popup), else use stored successful code
        previousCode: codeToEdit ?? previousSuccessfulCode,
        modelName: selectedModelId,
      };
      const result = await generateCodeFromPrompt(input);

      setValidationStatus("Running Post-Validation...");
      // Run post-generation validation pipeline
      const postValidationResult = await runValidationPipeline(result.code);
      if (!postValidationResult.success) {
          setValidationStatus(`Failed: ${postValidationResult.message}`);
          // Handle error, potentially offer retry or show validation errors
          throw new Error(`Generated code failed post-generation validation: ${postValidationResult.message}`);
      }
      setValidationStatus("Post-Validation Passed");


      setGeneratedCode(result.code);

      // Store successful code ONLY if validation passes
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
      setValidationStatus("Idle"); // Reset status after success
    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred during generation.";
      setGenerationError(errorMessage);
      setValidationStatus("Error"); // Set status to Error
      toast({
        variant: "destructive",
        title: "ERR: Generation Failed",
        description: errorMessage,
        className: "font-mono",
        duration: 10000, // Show error for longer
      });
      // Keep previous code state intact on error, especially during edits
    } finally {
      setIsLoadingGeneration(false);
      // Don't reset validation status here, let it show the final state (Pass/Fail/Error)
    }
  };

  // Wrapper for initial generation from main prompt
  const handleInitialGenerate = () => {
      handleGenerate(prompt);
  };

  // Handler for the edit popup submission
  const handleEditSubmit = (editPrompt: string) => {
      if (!generatedCode) {
           toast({ variant: "destructive", title: "ERR: No Code to Edit", description: "Generate code first.", className: "font-mono" });
           return;
      }
      handleGenerate(editPrompt, generatedCode); // Pass edit prompt and current code
      setIsEditPopupOpen(false);
  };

  // Handler for the retry button in the error alert
  const handleRetry = () => {
      if (prompt) {
          handleInitialGenerate();
      } else if (isEditPopupOpen) {
          // Logic to get the prompt from the edit popup if it's open
          // This requires passing the prompt state or a getter to the EditPopup or managing it here
          console.warn("Retry from edit popup not fully implemented");
      }
  };


  const getProviderIcon = (provider: CombinedModel['provider']) => {
      switch (provider) {
          case 'Ollama': return <Server className="h-4 w-4 mr-2 text-secondary flex-shrink-0" />;
          case 'Google AI': return <BrainCircuit className="h-4 w-4 mr-2 text-primary flex-shrink-0" />;
          // Add icons for OpenRouter, Hugging Face when implemented
          // case 'OpenRouter': return <CloudCog className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />;
          // case 'Hugging Face': return <span className="mr-2 text-yellow-400">🤗</span>;
          default: return null;
      }
  };

  // Group models by provider for the Select component
  const groupedModels = allModels.reduce((acc, model) => {
      const provider = model.provider; // Add other providers as needed
      (acc[provider] = acc[provider] || []).push(model);
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine button disabled states
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();
  const isEditDisabled = isLoadingGeneration || !generatedCode;


  return (
    <div className="flex flex-col h-screen bg-background text-foreground p-1 md:p-2 border-2 border-border shadow-[inset_0_0_10px_hsla(var(--foreground)/0.1)] rounded-sm overflow-hidden">
      {/* Header */}
      <header className="p-2 border-b-2 border-border mb-2 flex justify-between items-center flex-shrink-0">
         <div>
             <h1 className="text-lg md:text-xl font-bold text-primary font-mono chromatic-aberration-light" data-text="CodeSynth_Terminal//AI-IDE">CodeSynth_Terminal//AI-IDE</h1>
             <p className="text-xs md:text-sm text-muted-foreground font-mono">// AI-Assisted Development Interface v1.2</p>
         </div>
          <div className="flex items-center space-x-3">
             <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground p-1" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
            </Button>
             <span className="text-xs text-muted-foreground font-mono hidden md:inline">STATUS:</span>
             <div className={`w-2.5 h-2.5 rounded-full ${isLoadingGeneration ? 'bg-yellow-500 animate-pulse' : (generationError ? 'bg-destructive' : 'bg-primary')}`}></div>
          </div>
      </header>

      {/* Main Content Area - Adjusted for potential side panels */}
      <main className="flex-grow flex overflow-hidden gap-1 md:gap-2">

         {/* --- Conceptual Panels (Placeholders) --- */}
         <div className="hidden lg:flex lg:w-1/6 flex-col border border-border p-2 rounded-sm bg-card/50 overflow-hidden">
            <h3 className="text-sm font-mono text-secondary mb-2 flex items-center"><FolderTree className="h-4 w-4 mr-1"/> File_Explorer</h3>
            <div className="flex-grow overflow-auto text-xs text-muted-foreground font-mono">
                // Project Root<br/>
                // ├── src<br/>
                // │   ├── app<br/>
                // │   │   └── page.tsx<br/>
                // │   └── components<br/>
                // │       └── ... <br/>
                // └── package.json<br/>
                // (Placeholder Content)
            </div>
         </div>
         <Separator orientation="vertical" className="hidden lg:block h-auto bg-border/30" />
         {/* --- End Conceptual Panels --- */}

         {/* Center Area: Controls & Output */}
         <div className="flex-grow flex flex-col md:flex-row overflow-hidden gap-1 md:gap-2">
            {/* Left Panel: Controls */}
            <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col gap-2 md:gap-3 border border-border p-2 md:p-3 rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] overflow-y-auto min-h-[250px] md:min-h-0">
               {/* Model Selector */}
               <div className="space-y-1">
                  <Label htmlFor="model-select" className="text-sm font-medium text-secondary font-mono flex items-center">
                    &gt; Select Model_Source:
                     <button onClick={fetchAndCombineModels} disabled={isLoadingModels} className="ml-2 text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed p-0.5 rounded border border-transparent hover:border-accent">
                        <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                     </button>
                  </Label>
                   {isLoadingModels && !allModels.length ? (
                     <Skeleton className="h-10 w-full bg-muted/50 rounded-none border border-muted" />
                   ) : modelError && allModels.length === 0 ? (
                       <Alert variant="destructive" className="py-1 px-2 bg-destructive/10 border-destructive/50 text-destructive rounded-none text-xs">
                          <Terminal className="h-4 w-4" />
                          <AlertDescription className="ml-1 flex items-center justify-between">
                             {modelError}
                             <button onClick={fetchAndCombineModels} className="underline ml-2 font-bold hover:text-destructive/80">(Retry)</button>
                          </AlertDescription>
                       </Alert>
                   ) : (
                     <Select
                       value={selectedModelId ?? ""}
                       onValueChange={(value) => setSelectedModelId(value || undefined)}
                       disabled={isLoadingModels || allModels.length === 0}
                     >
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
                                         className="cursor-pointer hover:bg-accent/20 focus:bg-accent/30 font-mono pl-8 rounded-none data-[state=checked]:bg-primary/80 flex flex-col items-start"
                                      >
                                          <div className="flex items-center justify-between w-full">
                                              <span className="truncate">{model.name}</span>
                                              {model.size && (
                                                <Badge variant="outline" className="ml-2 text-xs px-1 py-0 border-muted text-muted-foreground bg-transparent rounded-none flex-shrink-0">
                                                    {(model.size / 1e9).toFixed(2)} GB
                                                </Badge>
                                              )}
                                          </div>
                                          {model.description && <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate w-full">{model.description}</p>}
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
                    // Ollama requires local server. Cloud models need API keys.
                  </p>
               </div>

               <Separator className="bg-border/50 my-1"/>

               {/* Prompt Input */}
               <div className="flex-grow flex flex-col min-h-[150px]">
                <PromptInput
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onSubmit={handleInitialGenerate}
                  isLoading={isLoadingGeneration}
                  disabled={isGenerateDisabled}
                  buttonText="Execute_Generation"
                  textAreaClass="terminal-input flex-grow" // Ensure textarea grows
                  placeholderText="// Prompt: Create a React component for... Add error handling to function X... Generate unit tests for Y..." // More descriptive placeholder
                />
               </div>
                {generationError && !isLoadingGeneration && (
                    <Alert variant="destructive" className="mt-1 bg-destructive/10 border-destructive/50 text-destructive font-mono rounded-none py-1 px-2">
                      <Terminal className="h-4 w-4" />
                      <AlertTitle className="text-sm">! Execution Error !</AlertTitle>
                      <AlertDescription className="text-xs flex justify-between items-center">
                          {generationError}
                          <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs underline p-0 h-auto hover:bg-destructive/20">
                              (Retry)
                          </Button>
                      </AlertDescription>
                    </Alert>
                )}
                 {/* Validation Pipeline status */}
                 <div className="text-xs text-muted-foreground font-mono mt-1 border-t border-border/30 pt-1 flex items-center">
                    <span className="mr-1"> // Validation Status:</span>
                    <Badge
                        variant={
                            validationStatus.startsWith("Failed") || validationStatus === "Error" ? "destructive" :
                            validationStatus.startsWith("Running") ? "secondary" :
                            validationStatus.includes("Passed") ? "default" : // Use default (primary) for success
                            "outline" // Idle
                        }
                        className={`text-[10px] px-1.5 py-0 rounded-none font-mono ${
                             validationStatus.includes("Passed") ? 'bg-primary/20 border-primary/50 text-primary' :
                             validationStatus.startsWith("Running") ? 'animate-pulse bg-secondary/20 border-secondary/50 text-secondary' : ''
                        }`}
                        >
                         {validationStatus}
                     </Badge>
                 </div>
            </div>

            {/* Separator */}
             <Separator orientation="vertical" className="hidden md:block mx-1 h-auto bg-border/30" />
             <Separator orientation="horizontal" className="md:hidden my-1 w-auto bg-border/30" />


            {/* Right Panel: Code Output */}
            <div className="w-full md:w-1/2 lg:w-3/5 flex-grow flex flex-col overflow-hidden border border-border rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] min-h-[300px] md:min-h-0">
              <CodeDisplay
                 code={generatedCode}
                 title="// Generated_Output_Buffer //"
                 language="typescript" // Default, could be dynamic based on prompt/output
                 isLoading={isLoadingGeneration}
                 containerClassName="flex-grow" // Make code display fill space
              />
              <div className="p-2 border-t border-border flex justify-end flex-shrink-0">
                 <Button
                   onClick={() => setIsEditPopupOpen(true)}
                   disabled={isEditDisabled}
                   className="btn-neon-secondary font-mono text-xs rounded-none px-3 py-1"
                 >
                     <Pencil className="mr-1 h-3 w-3" />
                     Edit_Code...
                 </Button>
               </div>
            </div>
         </div>


        {/* --- Conceptual Panels (Placeholders) --- */}
        <Separator orientation="vertical" className="hidden lg:block h-auto bg-border/30" />
         <div className="hidden lg:flex lg:w-1/4 flex-col border border-border p-2 rounded-sm bg-card/50 overflow-hidden">
            <h3 className="text-sm font-mono text-secondary mb-2 flex items-center"><MessageSquare className="h-4 w-4 mr-1"/> Agent_Chat</h3>
             <div className="flex-grow overflow-auto text-xs text-muted-foreground font-mono">
                 // Code Assistant: Ready...<br/>
                 // Project Architect: Planning...<br/>
                 // (Placeholder Content)
             </div>
              <h3 className="text-sm font-mono text-secondary mt-2 pt-2 border-t border-border/50 mb-1 flex items-center"><Info className="h-4 w-4 mr-1"/> MLOps/Info</h3>
              <div className="text-xs text-muted-foreground font-mono">
                 // Experiments: 0 active<br/>
                 // Security Scan: Pass<br/>
                 // Git Status: Synced<br/>
                 // (Placeholder Content)
              </div>
         </div>
         {/* --- End Conceptual Panels --- */}

      </main>

       {/* Footer */}
       <footer className="pt-1 mt-2 border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
         [ CodeSynth Terminal | Genkit: {getProviderNames(allModels)} | {(typeof window !== 'undefined' && new Date().getFullYear()) || ''} ]
      </footer>

       {/* Edit Popup Modal */}
       {isEditPopupOpen && (
         <EditPopup
           initialCode={generatedCode}
           onSubmit={handleEditSubmit}
           onClose={() => setIsEditPopupOpen(false)}
           isLoading={isLoadingGeneration}
           selectedModelId={selectedModelId}
         />
       )}

       {/* Settings Popup/Panel Component */}
       {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}

// Helper function to get unique provider names from the model list
function getProviderNames(models: CombinedModel[]): string {
    const providers = new Set(models.map(m => m.provider));
    const providerList = Array.from(providers);
    if (providerList.length === 0) return "No Providers";
    if (providerList.length > 2) return `${providerList.slice(0, 2).join(', ')} & Others`;
    return providerList.join(' | ');
}
