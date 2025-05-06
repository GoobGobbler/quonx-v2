
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, BrainCircuit, X, Pencil, Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info, Box, Bot, Construction } from "lucide-react"; // Added Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info, Box, Bot, Construction
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPopup } from "@/components/edit-popup";
import { SettingsPanel } from "@/components/settings-panel"; // Import SettingsPanel
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

// Define structure for combined models list
interface CombinedModel {
  id: string; // Fully qualified name (e.g., "ollama/llama3", "googleai/gemini-1.5-flash")
  name: string; // Display name (e.g., "llama3", "Gemini 1.5 Flash")
  provider: 'Ollama' | 'Google AI' | 'OpenRouter' | 'Hugging Face'; // Expand this as more providers are *actually* configured
  size?: number; // Optional size in bytes (primarily for Ollama)
  description?: string; // Optional description
}

// Key for localStorage settings
const SETTINGS_STORAGE_KEY = 'codesynth_settings';

// --- Hardcoded Models (Examples - Actual list depends on fetched/configured) ---
// Add more known models here as needed, especially for cloud providers
// These serve as examples and might not be active unless API keys are set in settings
const POTENTIAL_CLOUD_MODELS: CombinedModel[] = [
  // Google AI / Gemini Models (Requires GOOGLE_API_KEY in Settings)
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model' },

  // OpenRouter models (Requires OPENROUTER_API_KEY in Settings)
  { id: 'openrouter/anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OR)', provider: 'OpenRouter', description: 'High performance model via OR' },
  { id: 'openrouter/google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (OR)', provider: 'OpenRouter', description: 'Top model via OR' },
  { id: 'openrouter/meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B (OR)', provider: 'OpenRouter', description: 'Meta\'s Instruct model via OR' },
  { id: 'openrouter/mistralai/mistral-large-latest', name: 'Mistral Large (OR)', provider: 'OpenRouter', description: 'Mistral Large model via OR' },
  { id: 'openrouter/microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B (OR)', provider: 'OpenRouter', description: 'Microsoft research model via OR'},


  // Hugging Face models (Requires HF_API_KEY in Settings - Note: HF plugin might not be available)
  // { id: 'huggingface/codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B (HF)', provider: 'Hugging Face', description: 'Code-focused model via HF' },
];
// --- End Hardcoded Models ---

// Placeholder function for conceptual validation pipeline
async function runValidationPipeline(code: string, prompt?: string): Promise<{ success: boolean; message?: string }> {
    console.log("Running conceptual validation pipeline...", { codeLength: code.length, prompt });
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async work
    const success = true; // Always success for now
    return { success: success, message: success ? "Validation passed (Conceptual)" : "Conceptual validation failed." };
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [validationStatus, setValidationStatus] = useState<string>("Idle");

  // Fetch local Ollama models and combine with *configured* cloud models based on settings
  const fetchAndCombineModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    let localModels: CombinedModel[] = [];
    let ollamaError: string | null = null;
    let configuredCloudModels: CombinedModel[] = [];

    // Load settings from localStorage
    let settings: Record<string, any> = {};
    if (typeof window !== 'undefined') {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                settings = JSON.parse(storedSettings);
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage:", e);
        }
    }

    // Fetch Ollama models
    try {
        const fetchedOllamaModels = await listLocalOllamaModels();
        localModels = fetchedOllamaModels.map(m => ({
            id: `ollama/${m.name}`,
            name: m.name,
            provider: 'Ollama',
            size: m.size,
            description: `${m.details.family || 'Unknown'} (${(m.size / 1e9).toFixed(2)} GB)`
        }));
    } catch (err: any) {
        console.warn("Could not fetch local Ollama models:", err);
        ollamaError = err.message || 'Failed to connect to local Ollama server (http://127.0.0.1:11434). Is it running?';
    }

    // Check settings for API keys and add corresponding cloud models
    if (settings.googleApiKey) {
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Google AI'));
    }
    if (settings.openRouterApiKey) {
         configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'OpenRouter'));
    }
    // if (settings.huggingFaceApiKey) {
    //     configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Hugging Face'));
    // }


    // Combine available model sources
    const combined = [
        ...(ollamaError ? [] : localModels), // Only include Ollama if no error
        ...configuredCloudModels, // Include cloud models *only if* keys are configured
    ];
    setAllModels(combined);

    // Set a default model intelligently
    if (!selectedModelId && combined.length > 0) {
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOpenRouter = combined.find(m => m.provider === 'OpenRouter');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        // Prioritize Google, OpenRouter, Ollama, then first available
        setSelectedModelId(firstGoogle?.id || firstOpenRouter?.id || firstOllama?.id || combined[0].id);
    } else if (selectedModelId && !combined.some(m => m.id === selectedModelId)) {
        // If current selection is no longer valid, reset default
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOpenRouter = combined.find(m => m.provider === 'OpenRouter');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        setSelectedModelId(firstGoogle?.id || firstOpenRouter?.id || firstOllama?.id || (combined.length > 0 ? combined[0].id : undefined));
    } else if (combined.length === 0) {
         setSelectedModelId(undefined); // No models found
    }

    // Handle errors/warnings
    let errorMessage = "";
    let warningMessage = "";

    if (ollamaError && configuredCloudModels.length > 0) {
        warningMessage = `${ollamaError}. Cloud models are available.`;
    } else if (ollamaError && configuredCloudModels.length === 0) {
        errorMessage = `${ollamaError}. Also, no cloud providers seem to be configured with API keys in Settings.`;
    } else if (combined.length === 0 && !ollamaError) {
        errorMessage = "No AI models available. Ensure the Ollama server is running or configure cloud provider API keys in Settings.";
    }

    if (warningMessage) {
        toast({
            variant: "default",
            title: "Ollama Connection Warning",
            description: warningMessage,
            className: "font-mono border-secondary text-secondary",
        });
    }
    if (errorMessage) {
         setModelError(errorMessage); // Set state to display persistent error
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
    setValidationStatus("Pre-Validation Passed. Generating...");

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
      // Keep validation status showing the final outcome until next action
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
      // Simple retry always uses the main prompt for now
      if (prompt) {
          handleInitialGenerate();
      } else {
           toast({ variant: "destructive", title: "ERR: No Prompt to Retry", description: "Enter a prompt first.", className: "font-mono" });
      }
  };


  const getProviderIcon = (provider: CombinedModel['provider']) => {
      switch (provider) {
          case 'Ollama': return <Server className="h-4 w-4 mr-2 text-secondary flex-shrink-0" />;
          case 'Google AI': return <BrainCircuit className="h-4 w-4 mr-2 text-primary flex-shrink-0" />;
          case 'OpenRouter': return <CloudCog className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />; // Example OR icon
          case 'Hugging Face': return <span className="mr-2 text-yellow-400 flex-shrink-0">🤗</span>; // Example HF icon
          default: return <Box className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />; // Default box icon
      }
  };

  // Group models by provider for the Select component
  const groupedModels = allModels.reduce((acc, model) => {
      const provider = model.provider;
      (acc[provider] = acc[provider] || []).push(model);
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine button disabled states
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();
  const isEditDisabled = isLoadingGeneration || !generatedCode;


  return (
   <TooltipProvider> {/* Wrap main content in TooltipProvider */}
    <div className="flex flex-col h-screen bg-background text-foreground p-1 md:p-2 border-2 border-border shadow-[inset_0_0_10px_hsla(var(--foreground)/0.1)] rounded-sm overflow-hidden">
      {/* Header */}
      <header className="p-2 border-b-2 border-border mb-2 flex justify-between items-center flex-shrink-0">
         <div>
             <h1 className="text-lg md:text-xl font-bold text-primary font-mono chromatic-aberration-light" data-text="CodeSynth_Terminal//AI-IDE">CodeSynth_Terminal//AI-IDE</h1>
             <p className="text-xs md:text-sm text-muted-foreground font-mono">// AI-Assisted Development Interface v1.3</p>
         </div>
          <div className="flex items-center space-x-3">
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground p-1" onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs bg-popover text-popover-foreground border-border">
                    <p>Open Settings</p>
                </TooltipContent>
            </Tooltip>
             <span className="text-xs text-muted-foreground font-mono hidden md:inline">STATUS:</span>
             <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`w-2.5 h-2.5 rounded-full ${isLoadingGeneration ? 'bg-yellow-500 animate-pulse' : (generationError ? 'bg-destructive' : 'bg-green-500')}`}></div>
                </TooltipTrigger>
                 <TooltipContent side="bottom" className="font-mono text-xs bg-popover text-popover-foreground border-border">
                    <p>{isLoadingGeneration ? 'Generating...' : generationError ? 'Error' : 'Idle / Ready'}</p>
                 </TooltipContent>
             </Tooltip>
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
                // │   ├── components<br/>
                // │   │   └── ... <br/>
                // │   └── ai<br/>
                // │       └── flows<br/>
                // └── package.json<br/>
                 <span className="text-yellow-500/70">// (File Explorer Not Implemented)</span>
            </div>
             <div className="mt-auto pt-2 border-t border-border/30 text-center">
                  <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground w-full justify-start" disabled>
                    <GitBranch className="h-3 w-3 mr-1" /> Git Sync
                  </Button>
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
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button onClick={fetchAndCombineModels} disabled={isLoadingModels} className="ml-2 text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed p-0.5 rounded border border-transparent hover:border-accent">
                              <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground border-border">
                           <p>Refresh Model List</p>
                        </TooltipContent>
                     </Tooltip>
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
                                         className="cursor-pointer hover:bg-accent/20 focus:bg-accent/30 font-mono pl-8 rounded-none data-[state=checked]:bg-primary/80 data-[state=checked]:text-primary-foreground flex flex-col items-start"
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
                              <SelectItem value="no-models" disabled className="font-mono rounded-none">[No Models Available - Check Settings/Ollama]</SelectItem>
                           )}
                        </SelectContent>
                     </Select>
                   )}
                  <p className="text-xs text-muted-foreground font-mono">
                    // Ensure API keys are set in Settings for cloud models.
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
                            validationStatus.startsWith("Running") || validationStatus.includes("Generating") ? "secondary" :
                            validationStatus.includes("Passed") ? "default" : // Use default (primary) for success
                            "outline" // Idle
                        }
                        className={`text-[10px] px-1.5 py-0 rounded-none font-mono ${
                             validationStatus.includes("Passed") ? 'bg-primary/20 border-primary/50 text-primary' :
                             validationStatus.startsWith("Running") || validationStatus.includes("Generating") ? 'animate-pulse bg-secondary/20 border-secondary/50 text-secondary' : ''
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
                 <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Wrap button in span for Tooltip when disabled */}
                      <span tabIndex={isEditDisabled ? 0 : -1}>
                         <Button
                           onClick={() => setIsEditPopupOpen(true)}
                           disabled={isEditDisabled}
                           className="btn-neon-secondary font-mono text-xs rounded-none px-3 py-1"
                           aria-disabled={isEditDisabled} // For accessibility
                         >
                             <Pencil className="mr-1 h-3 w-3" />
                             Edit_Code...
                         </Button>
                       </span>
                    </TooltipTrigger>
                     <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground border-border">
                        <p>{isEditDisabled && !generatedCode ? 'Generate code first to enable editing.' : isEditDisabled && isLoadingGeneration ? 'Wait for generation to finish.' : 'Edit the generated code with new instructions.'}</p>
                    </TooltipContent>
                 </Tooltip>
               </div>
            </div>
         </div>


        {/* --- Conceptual Panels (Placeholders) --- */}
        <Separator orientation="vertical" className="hidden lg:block h-auto bg-border/30" />
         <div className="hidden lg:flex lg:w-1/4 flex-col border border-border p-2 rounded-sm bg-card/50 overflow-hidden">
            <h3 className="text-sm font-mono text-secondary mb-2 flex items-center"><Bot className="h-4 w-4 mr-1"/> AI_Agents</h3>
             <div className="flex-grow overflow-auto text-xs text-muted-foreground font-mono space-y-1">
                 <p>// Code Assistant: <span className="text-green-400/80">Ready</span></p>
                 <p>// Project Architect: <span className="text-yellow-400/80">Planning...</span></p>
                 <p className="text-yellow-500/70">// (Agent Chat Not Implemented)</p>
             </div>
              <h3 className="text-sm font-mono text-secondary mt-2 pt-2 border-t border-border/50 mb-1 flex items-center"><Info className="h-4 w-4 mr-1"/> System_Info</h3>
              <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                 <p>// Security Scan: <span className="text-green-400/80">Pass (Conceptual)</span></p>
                 <p>// MLOps: <span className="text-yellow-500/70">Not Connected</span></p>
                 <p>// Collaboration: <span className="text-yellow-500/70">Offline</span></p>
                 <p className="text-yellow-500/70">// (Integrations Not Implemented)</p>
              </div>
               <div className="mt-auto pt-2 border-t border-border/30 text-center">
                  <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground w-full justify-start" disabled>
                    <Construction className="h-3 w-3 mr-1" /> Build & Deploy
                  </Button>
             </div>
         </div>
         {/* --- End Conceptual Panels --- */}

      </main>

       {/* Footer */}
       <footer className="pt-1 mt-2 border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
         [ CodeSynth Terminal | Models: {getProviderNames(allModels)} | &copy; {(typeof window !== 'undefined' && new Date().getFullYear()) || ''} ]
      </footer>

       {/* Edit Popup Modal */}
       {isEditPopupOpen && (
         <EditPopup
           initialCode={generatedCode}
           onSubmit={handleEditSubmit}
           onClose={() => setIsEditPopupOpen(false)}
           isLoading={isLoadingGeneration}
           selectedModelId={selectedModelId} // Pass selected model for context
         />
       )}

       {/* Settings Panel Component */}
       {/* Pass fetchAndCombineModels to SettingsPanel so it can trigger a refresh on save */}
       {isSettingsOpen && <SettingsPanel onClose={() => {setIsSettingsOpen(false); fetchAndCombineModels();}} />}
    </div>
   </TooltipProvider>
  );
}

// Helper function to get unique provider names from the model list
function getProviderNames(models: CombinedModel[]): string {
    if (!models || models.length === 0) return "None Loaded";
    const providers = new Set(models.map(m => m.provider));
    const providerList = Array.from(providers);
    if (providerList.length === 0) return "None Configured";
    // Sort providers for consistent display
    providerList.sort((a, b) => {
       const order = ['Ollama', 'Google AI', 'OpenRouter', 'Hugging Face'];
       return order.indexOf(a) - order.indexOf(b);
    });
    if (providerList.length > 3) return `${providerList.slice(0, 3).join('/')} + Others`;
    return providerList.join(' | ');
}
