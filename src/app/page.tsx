
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
import { CodeDisplay } from "@/components/code-display";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, BrainCircuit, X, Pencil, Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info, Box, Bot, Construction, HardDrive, Workflow, TestTubeDiagonal, UserCheck, LayoutPanelLeft, Code, File, Folder } from "lucide-react"; // Added icons
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPopup } from "@/components/edit-popup";
import { SettingsPanel } from "@/components/settings-panel"; // Import SettingsPanel
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarSeparator, SidebarInput, SidebarInset, SidebarMenuSkeleton } from "@/components/ui/sidebar"; // Import Sidebar components


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

// --- Potential Cloud Models (Activated based on Settings) ---
// These models are only added to the list if their corresponding API key is present in settings.
// Note: OpenRouter and HuggingFace plugins (@1.8.0) were not found during build. Integration is conceptual.
const POTENTIAL_CLOUD_MODELS: CombinedModel[] = [
  // Google AI / Gemini Models (Requires GOOGLE_API_KEY in Settings)
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model for general tasks' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model for complex tasks' },

  // OpenRouter models (Requires OPENROUTER_API_KEY in Settings - Plugin @1.8.0 unavailable)
  { id: 'openrouter/anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OR)', provider: 'OpenRouter', description: 'High performance model via OR' },
  { id: 'openrouter/google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (OR)', provider: 'OpenRouter', description: 'Top model via OR' },
  { id: 'openrouter/meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B (OR)', provider: 'OpenRouter', description: 'Meta\'s Instruct model via OR' },
  { id: 'openrouter/mistralai/mistral-large-latest', name: 'Mistral Large (OR)', provider: 'OpenRouter', description: 'Mistral Large model via OR' },
  { id: 'openrouter/microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B (OR)', provider: 'OpenRouter', description: 'Microsoft research model via OR'},

  // Hugging Face models (Requires HF_API_KEY in Settings - Plugin @1.8.0 unavailable)
  { id: 'huggingface/codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B (HF)', provider: 'Hugging Face', description: 'Code-focused model via HF' },
];
// --- End Potential Cloud Models ---

// Placeholder function for conceptual validation pipeline
async function runValidationPipeline(code: string, prompt?: string): Promise<{ success: boolean; message?: string }> {
    console.log("Running conceptual validation pipeline...", { codeLength: code.length, prompt });
    // Simulate async work (e.g., calling a linter or test runner)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    // In a real implementation:
    // 1. Parse the code (check syntax)
    // 2. Run linters (e.g., ESLint)
    // 3. Check dependencies (if possible)
    // 4. Optionally run tests in a sandboxed environment
    const success = Math.random() > 0.15; // Simulate 85% success rate for demo
    const messages = [
        "Syntax error on line 15 (simulated).",
        "Dependency 'lodash' not found (simulated).",
        "Test suite failed: 2/5 tests passed (simulated).",
        "Security vulnerability detected: Use of eval() (simulated).",
        "Code style violation: Max line length exceeded (simulated)."
    ];
    const message = success ? "Validation passed (Conceptual)" : messages[Math.floor(Math.random() * messages.length)];
    console.log("Validation Result:", { success, message });
    return { success: success, message: message };
}

// Define settings structure (must match settings-panel.tsx)
interface AppSettings {
    ollamaBaseUrl: string;
    googleApiKey: string;
    openRouterApiKey: string;
    huggingFaceApiKey: string;
    themePreset: string;
    font: string;
    enableScanlines: boolean;
    enableGrain: boolean;
    enableGlow: boolean;
    modelTimeoutSeconds: number;
    maxOutputTokens: number;
    validationThreshold: number;
    enableAnalytics: boolean;
}

// Default settings (must match settings-panel.tsx)
const defaultSettings: AppSettings = {
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    googleApiKey: '',
    openRouterApiKey: '',
    huggingFaceApiKey: '',
    themePreset: 'Retro Terminal',
    font: 'Cutive Mono',
    enableScanlines: true,
    enableGrain: true,
    enableGlow: true,
    modelTimeoutSeconds: 120,
    maxOutputTokens: 4096,
    validationThreshold: 80,
    enableAnalytics: false,
};


export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [previousSuccessfulCode, setPreviousSuccessfulCode] = useState<string | undefined>(undefined);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast, dismiss } = useToast(); // Destructure dismiss

  const [allModels, setAllModels] = useState<CombinedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [validationStatus, setValidationStatus] = useState<string>("Idle"); // Idle, Running Pre-Validation, Generating, Running Post-Validation, Failed, Error, Success
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);

  // --- State for Conceptual Features ---
  const [fileExplorerVisible, setFileExplorerVisible] = useState(true); // Example state
  const [terminalVisible, setTerminalVisible] = useState(false); // Example state
  const [codeAssistantChatVisible, setCodeAssistantChatVisible] = useState(false); // Example state
  const [projectArchitectChatVisible, setProjectArchitectChatVisible] = useState(false); // Example state
  const [activeTab, setActiveTab] = useState<string | null>(null); // Example: Track active file tab
  const [openFiles, setOpenFiles] = useState<string[]>([]); // Example: Track open files

  // Example file tree data (conceptual)
  const [fileTree, setFileTree] = useState([
      { id: 'src', name: 'src', type: 'folder', children: [
          { id: 'app', name: 'app', type: 'folder', children: [
              { id: 'page.tsx', name: 'page.tsx', type: 'file' },
              { id: 'layout.tsx', name: 'layout.tsx', type: 'file' },
              { id: 'globals.css', name: 'globals.css', type: 'file' },
          ]},
          { id: 'components', name: 'components', type: 'folder', children: [
              { id: 'ui', name: 'ui', type: 'folder', children: []},
              { id: 'prompt-input.tsx', name: 'prompt-input.tsx', type: 'file'},
          ]},
          { id: 'ai', name: 'ai', type: 'folder', children: []},
          { id: 'lib', name: 'lib', type: 'folder', children: []},
      ]},
      { id: 'public', name: 'public', type: 'folder', children: []},
      { id: 'package.json', name: 'package.json', type: 'file' },
      { id: 'README.md', name: 'README.md', type: 'file' },
  ]);
   // --- End State for Conceptual Features ---


  // Fetch local Ollama models and combine with *configured* cloud models based on settings
  const fetchAndCombineModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    dismiss('model-error-toast'); // Dismiss previous error toast immediately
    let localModels: CombinedModel[] = [];
    let ollamaError: string | null = null;
    let configuredCloudModels: CombinedModel[] = [];

    // Load settings from localStorage
    let settings: Partial<AppSettings> = {}; // Use AppSettings type from settings-panel
    if (typeof window !== 'undefined') {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                settings = JSON.parse(storedSettings);
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage:", e);
            toast({
                 variant: "destructive",
                 title: "SYS WARN: Settings Load Fail",
                 description: "Could not parse saved settings. Using defaults.",
                 className: "font-mono",
             });
        }
    }

    // Fetch Ollama models if base URL seems valid
    const ollamaBaseUrl = settings.ollamaBaseUrl || defaultSettings.ollamaBaseUrl;
    if (ollamaBaseUrl && ollamaBaseUrl.startsWith('http')) {
        try {
            console.log(`Attempting to fetch Ollama models from: ${ollamaBaseUrl}`);
            const fetchedOllamaModels = await listLocalOllamaModels(ollamaBaseUrl);
            localModels = fetchedOllamaModels.map(m => ({
                id: `ollama/${m.name}`,
                name: m.name,
                provider: 'Ollama',
                size: m.size,
                description: `${m.details.family || 'Unknown'} (${(m.size / 1e9).toFixed(2)} GB)`
            }));
            console.log(`Successfully fetched ${localModels.length} Ollama models.`);
        } catch (err: any) {
            console.warn("Could not fetch local Ollama models:", err);
            ollamaError = `Failed to connect to Ollama server at ${ollamaBaseUrl}. Is it running and accessible? ${err.message || ''}`;
        }
    } else {
        ollamaError = "Ollama Base URL in settings is invalid or missing.";
    }


    // Check settings for API keys and add corresponding cloud models
    if (settings.googleApiKey) {
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Google AI'));
    }
    if (settings.openRouterApiKey) {
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'OpenRouter'));
    }
     if (settings.huggingFaceApiKey) {
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Hugging Face'));
    }


    // Handle OpenRouter and HuggingFace conceptually (plugins unavailable)
    let pluginWarnings: string[] = [];
    const expectedPackages = ['@genkit-ai/openrouter', '@genkit-ai/huggingface']; // Example, adjust if needed
    // In a real scenario, you might check if the corresponding plugin function exists in Genkit's registry
    // or simply rely on Genkit's internal error handling when trying to use the model.
    // Here, we simulate based on settings keys.
    if (settings.openRouterApiKey && !expectedPackages.includes('@genkit-ai/openrouter')) { // Simplified check
        console.warn("OpenRouter API key is set, but @genkit-ai/openrouter plugin@1.8.0 is not installed/available.");
        pluginWarnings.push("OpenRouter integration may be unavailable (plugin not found)");
    }
    if (settings.huggingFaceApiKey && !expectedPackages.includes('@genkit-ai/huggingface')) { // Simplified check
        console.warn("Hugging Face API key is set, but @genkit-ai/huggingface plugin@1.8.0 is not installed/available.");
         pluginWarnings.push("HuggingFace integration may be unavailable (plugin not found)");
    }


    // Combine available model sources
    const combined = [
        ...(ollamaError ? [] : localModels), // Only include Ollama if no error
        ...configuredCloudModels, // Include cloud models *only if* keys are configured
    ];
    setAllModels(combined);

    // Set a default model intelligently, prioritizing configured cloud models, then Ollama
    if (!selectedModelId || !combined.some(m => m.id === selectedModelId)) {
        const firstGoogle = combined.find(m => m.provider === 'Google AI');
        const firstOR = combined.find(m => m.provider === 'OpenRouter');
        const firstHF = combined.find(m => m.provider === 'Hugging Face');
        const firstOllama = combined.find(m => m.provider === 'Ollama');
        const newSelectedId = firstGoogle?.id || firstOR?.id || firstHF?.id || firstOllama?.id || (combined.length > 0 ? combined[0].id : undefined);
        setSelectedModelId(newSelectedId);
         console.log("Model selection updated:", newSelectedId ?? "None Available");
    } else if (combined.length === 0) {
         setSelectedModelId(undefined); // No models found
    }

    // Handle errors/warnings more granularly
    let errorMessage = "";
    let warningMessages: string[] = pluginWarnings; // Start with plugin warnings

    if (ollamaError) {
        if (configuredCloudModels.length > 0) {
            // Ollama failed, but cloud models exist: Warning
            warningMessages.push(ollamaError);
        } else {
            // Ollama failed AND no cloud models: Error
             errorMessage = `${ollamaError}. No cloud providers configured either. Check Settings.`;
        }
    } else if (combined.length === 0) {
        // No Ollama error, but list is empty (means Ollama OK but returned 0 models, and no cloud configured)
        errorMessage = "No AI models found. Check Ollama for downloaded models or configure cloud API keys in Settings.";
    }

    // Display warnings as non-destructive toasts
    if (warningMessages.length > 0) {
        toast({
            id: 'model-warning-toast',
            variant: "default", // Use default variant, potentially styled
            title: "SYS WARN: Model Configuration",
            description: warningMessages.join(' '),
            className: "font-mono border-secondary text-secondary", // Keep specific style for warning
            duration: 10000, // Show for 10 seconds
        });
    }

    // Display fatal error persistently
    if (errorMessage) {
         setModelError(errorMessage); // Set state for persistent display in UI
         toast({
            id: 'model-error-toast', // Assign an ID
            variant: "destructive",
            title: "FATAL: No Models Available",
            description: errorMessage,
            className: "font-mono",
            duration: Infinity, // Keep persistent until resolved
         });
    } else {
         setModelError(null); // Clear UI error if resolved
         // Dismiss persistent error toast if models are now available
         dismiss('model-error-toast');
    }


    setIsLoadingModels(false);
  }, [selectedModelId, toast, dismiss]); // Add dismiss to dependencies

  // Effect to load models on mount and when settings might change (e.g., after closing settings)
  useEffect(() => {
    fetchAndCombineModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount initially. fetchAndCombineModels is called again manually after settings close.

   // Effect to load previous code from localStorage
   useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem('previousSuccessfulCode');
        if (storedCode) {
            setPreviousSuccessfulCode(storedCode);
            // Set generatedCode as well so it's displayed initially
            setGeneratedCode(storedCode);
             setValidationStatus("Loaded"); // Indicate loaded state
             setValidationMessage("Restored previous generation.");
             /* Optional: Show a less intrusive notification or none
             toast({
                title: "SYS: Previous Code Loaded",
                description: "Restored last successful generation from buffer.",
                className: "font-mono text-xs",
             });
             */
        } else {
            setGeneratedCode("// Output buffer empty. Awaiting command...");
            setValidationStatus("Idle");
        }
    }
   }, []); // Run only once on mount


  const handleGenerate = async (currentPrompt: string, codeToEdit?: string) => {
     if (!currentPrompt.trim()) {
      setGenerationError("Input prompt required.");
      toast({ variant: "destructive", title: "ERR: Prompt Empty", description: "Input prompt required.", className: "font-mono" });
      return;
    }
    if (!selectedModelId) {
        setGenerationError("Generation model must be selected.");
        toast({ variant: "destructive", title: "ERR: No Model Selected", description: "Select generation model.", className: "font-mono" });
        return;
    }

    setIsLoadingGeneration(true);
    setGenerationError(null); // Clear previous errors
    setValidationStatus("Running Pre-Validation...");
    setValidationMessage("Checking input parameters...");
    toast({ title: "STATUS: Pre-Validation", description: "Checking input...", className: "font-mono text-xs" });


    // Conceptual Pre-generation validation (can be expanded)
    const preValidationResult = await runValidationPipeline(codeToEdit ?? '', currentPrompt);
    if (!preValidationResult.success) {
        const errorMsg = `Pre-generation validation failed: ${preValidationResult.message}`;
        setValidationStatus("Failed");
        setValidationMessage(preValidationResult.message);
        setGenerationError(errorMsg);
        toast({
            variant: "destructive",
            title: "ERR: Pre-Validation Failed",
            description: preValidationResult.message,
            className: "font-mono",
        });
        setIsLoadingGeneration(false);
        return;
    }
    setValidationStatus("Generating...");
    setValidationMessage(`Using model: ${allModels.find(m => m.id === selectedModelId)?.name || selectedModelId}`);
    toast({ title: "STATUS: Generating Code", description: `Sending request to ${selectedModelId}...`, className: "font-mono text-xs" });


    try {
      const input: GenerateCodeFromPromptInput = {
        prompt: currentPrompt,
        // Use codeToEdit if provided (from edit popup), else use stored successful code
        previousCode: codeToEdit ?? previousSuccessfulCode,
        modelName: selectedModelId,
      };
      const result = await generateCodeFromPrompt(input);

      setValidationStatus("Running Post-Validation...");
      setValidationMessage("Checking generated code integrity...");
      toast({ title: "STATUS: Post-Validation", description: "Checking generated code...", className: "font-mono text-xs" });

      // Run post-generation validation pipeline (Conceptual)
      const postValidationResult = await runValidationPipeline(result.code);
      if (!postValidationResult.success) {
          const errorMsg = `Generated code failed validation: ${postValidationResult.message}`;
          setValidationStatus("Failed");
          setValidationMessage(postValidationResult.message);
          // Display the flawed code for inspection/edit but show error
          setGeneratedCode(result.code);
          setGenerationError(errorMsg); // Set error state for persistent UI message
           toast({
               variant: "destructive",
               title: "ERR: Post-Validation Failed",
               description: postValidationResult.message + " Code generated but may contain errors.",
               className: "font-mono",
               duration: 10000,
           });
          // Do NOT save to previousSuccessfulCode or localStorage if validation fails
      } else {
           setValidationStatus("Success");
           setValidationMessage("Code generated and validated successfully.");
           setGeneratedCode(result.code);
           setGenerationError(null); // Clear error on success

           // Store successful code ONLY if validation passes
           setPreviousSuccessfulCode(result.code);
           if (typeof window !== 'undefined') {
             try {
                localStorage.setItem('previousSuccessfulCode', result.code);
             } catch (e) {
                console.error("Failed to save code to localStorage:", e);
                toast({ variant: "destructive", title: "WARN: Local Storage Full?", description: "Could not save generated code.", className: "font-mono" });
             }
           }

           const selectedModel = allModels.find(m => m.id === selectedModelId);
           toast({
             title: "STATUS: Generation OK",
             description: `Code generated with ${selectedModel?.name || selectedModelId}. Validation passed.`,
             className: "font-mono border-primary text-primary",
           });
            // Reset status after a delay on success
           setTimeout(() => {
                if (validationStatus === "Success") { // Check if status hasn't changed
                     setValidationStatus("Idle");
                     setValidationMessage(undefined);
                }
           }, 5000);
      }

    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred during generation.";
      setGenerationError(errorMessage);
      setValidationStatus("Error"); // Set status to Error
      setValidationMessage(errorMessage.substring(0, 100) + "..."); // Show snippet of error
      toast({
        variant: "destructive",
        title: "ERR: Generation Failed",
        description: errorMessage,
        className: "font-mono",
        duration: 15000, // Show error for longer
      });
      // Keep previous code state intact on error
    } finally {
      setIsLoadingGeneration(false);
      // Don't reset validation status automatically on fail/error, wait for user action (Retry)
    }
  };

  // Wrapper for initial generation from main prompt
  const handleInitialGenerate = () => {
      handleGenerate(prompt);
  };

  // Handler for the edit popup submission
  const handleEditSubmit = (editPrompt: string) => {
      if (!generatedCode || generatedCode === "// Output buffer empty. Awaiting command...") {
           toast({ variant: "destructive", title: "ERR: No Code to Edit", description: "Generate code first.", className: "font-mono" });
           return;
      }
      // Use a more descriptive prompt for editing
      const combinedEditPrompt = `Edit the following code based on these instructions:\n\nInstructions: ${editPrompt}\n\nCurrent Code to Edit:\n\`\`\`\n${generatedCode}\n\`\`\``;
      handleGenerate(combinedEditPrompt, generatedCode); // Pass combined prompt and current code
      setIsEditPopupOpen(false);
  };

  // Handler for the retry button in the error alert or validation failed state
  const handleRetry = () => {
       if (prompt || previousSuccessfulCode) { // Allow retry even if prompt is empty if there's previous code
           // Decide if it's a retry of initial generation or an edit
           if (isEditPopupOpen) { // This state check might be tricky, better to pass context if needed
               // If the edit popup was the source, maybe resubmit that?
               // For simplicity, let's assume retry always uses the main prompt input
               console.warn("Retry clicked, assuming retry of main prompt generation.");
               handleGenerate(prompt, previousSuccessfulCode); // Retry with current prompt and last good code
           } else {
               handleGenerate(prompt, previousSuccessfulCode); // Retry with current prompt and last good code
           }
       } else {
           toast({ variant: "destructive", title: "ERR: Nothing to Retry", description: "Enter a prompt or load previous code.", className: "font-mono" });
       }
  };


  const getProviderIcon = (provider: CombinedModel['provider']) => {
      switch (provider) {
          case 'Ollama': return <HardDrive className="h-4 w-4 mr-2 text-secondary flex-shrink-0" title="Ollama (Local)" />;
          case 'Google AI': return <BrainCircuit className="h-4 w-4 mr-2 text-primary flex-shrink-0" title="Google AI" />;
          case 'OpenRouter': return <CloudCog className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" title="OpenRouter" />; // Assume plugin is available now
          case 'Hugging Face': return <span className="mr-2 text-yellow-400 flex-shrink-0" title="Hugging Face">🤗</span>; // Assume plugin is available now
          default: return <Box className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" title="Unknown Provider" />;
      }
  };

  // Group models by provider for the Select component
  const groupedModels = allModels.reduce((acc, model) => {
      // Skip placeholder models if they exist (optional, depends on decision above)
      // if (model.id.startsWith('placeholder-')) return acc; // Re-evaluate if placeholders are needed

      const provider = model.provider;
      (acc[provider] = acc[provider] || []).push(model);
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine button disabled states
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();
  // Disable edit if loading, no code exists, or if there was a generation error OR validation failure
  const isEditDisabled = isLoadingGeneration || !generatedCode || generatedCode === "// Output buffer empty. Awaiting command..." || !!generationError || validationStatus === "Failed";


  // Helper function to render file tree (recursive) - conceptual
  const renderFileTree = (nodes: any[]) => {
      return nodes.map(node => (
          <SidebarMenuItem key={node.id}>
              <SidebarMenuButton
                  size="sm"
                  className="w-full justify-start"
                  tooltip={node.name} // Show full name on hover if collapsed
                  onClick={() => {
                      if (node.type === 'file') {
                          setActiveTab(node.id);
                          if (!openFiles.includes(node.id)) {
                              setOpenFiles([...openFiles, node.id]);
                          }
                          console.log("Open file:", node.name); // Conceptual action
                      }
                  }}
              >
                  {node.type === 'folder' ? <Folder className="text-accent" /> : <File className="text-secondary"/>}
                  <span className="truncate">{node.name}</span>
              </SidebarMenuButton>
              {node.children && node.children.length > 0 && (
                  <SidebarMenuSub>
                      {renderFileTree(node.children)}
                  </SidebarMenuSub>
              )}
          </SidebarMenuItem>
      ));
  };

  return (
   <TooltipProvider delayDuration={100}> {/* Standard delay */}
    <SidebarProvider>
       <div className="flex flex-col h-screen bg-background text-foreground p-1 md:p-2 border-2 border-border shadow-[inset_0_0_10px_hsla(var(--foreground)/0.1)] rounded-sm overflow-hidden">
       {/* Header */}
       <header className="p-2 border-b-2 border-border mb-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
              {/* Sidebar Trigger */}
                <SidebarTrigger className="md:hidden" /> {/* Only show on mobile */}
               <Terminal className="h-6 w-6 text-primary hidden sm:block"/>
              <div>
                 <h1 className="text-lg md:text-xl font-bold text-primary font-mono chromatic-aberration-light" data-text="CodeSynth_IDE">CodeSynth_IDE</h1>
                 <p className="text-xs md:text-sm text-muted-foreground font-mono">// AI Code Environment v0.2</p>
             </div>
          </div>
           <div className="flex items-center space-x-3">
               {/* Settings Button */}
              <Tooltip>
                 <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground p-1 hover:bg-accent/10 rounded-none" onClick={() => setIsSettingsOpen(true)}>
                         <Settings className="h-4 w-4" />
                         <span className="sr-only">Settings</span>
                     </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" className="font-mono text-xs bg-popover text-popover-foreground border-border rounded-none">
                     <p>System Configuration [Settings]</p>
                 </TooltipContent>
             </Tooltip>
             {/* Status Indicator */}
             <span className="text-xs text-muted-foreground font-mono hidden md:inline">SYS_STATUS:</span>
             <Tooltip>
                 <TooltipTrigger asChild>
                      <div className={`w-3 h-3 rounded-full border border-foreground/30 relative flex items-center justify-center transition-colors duration-300 ${isLoadingGeneration || isLoadingModels ? 'bg-yellow-500 animate-pulse' : (generationError || validationStatus === "Failed" || validationStatus === "Error" ? 'bg-destructive' : 'bg-green-500')}`}>
                          {(isLoadingGeneration || isLoadingModels) && <div className="absolute w-4 h-4 bg-yellow-500/30 rounded-full animate-ping"></div>}
                      </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-xs bg-popover text-popover-foreground border-border rounded-none max-w-[250px] text-center">
                      <p>
                          {isLoadingModels ? 'Loading Models...' :
                           isLoadingGeneration ? 'AI Processing...' :
                           generationError ? `Error: ${generationError.substring(0, 70)}...` :
                           validationStatus === "Failed" ? `Validation Failed: ${validationMessage || ''}` :
                           validationStatus === "Error" ? `Generation Error: ${validationMessage || ''}` :
                           validationStatus === "Success" ? 'Generation OK' :
                           validationStatus === "Loaded" ? 'Previous Code Loaded' :
                           validationStatus.startsWith("Running") ? validationStatus :
                           'System Idle / Ready'}
                       </p>
                  </TooltipContent>
             </Tooltip>
           </div>
       </header>

       {/* Main Content Area with Sidebar */}
        <div className="flex-grow flex overflow-hidden">
            <Sidebar side="left" collapsible="icon">
                <SidebarHeader>
                    <h2 className="font-mono text-sm text-secondary">// Workspace</h2>
                    {/* Add search or other header items if needed */}
                    {/* <SidebarInput placeholder="Search files..."/> */}
                </SidebarHeader>
                <SidebarContent className="p-0">
                    <SidebarGroup>
                       <SidebarGroupLabel className="text-xs">// File_Explorer</SidebarGroupLabel>
                       <SidebarGroupContent>
                            <SidebarMenu>
                               {renderFileTree(fileTree)}
                            </SidebarMenu>
                       </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarSeparator />
                     <SidebarGroup>
                        <SidebarGroupLabel className="text-xs">// AI_Agents</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton tooltip="Code Assistant" onClick={() => setCodeAssistantChatVisible(true)}>
                                        <Bot />
                                        <span>Code Assistant</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton tooltip="Project Architect" onClick={() => setProjectArchitectChatVisible(true)}>
                                        <Construction />
                                         <span>Project Architect</span>
                                     </SidebarMenuButton>
                                 </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    {/* Add more sidebar sections: Git, Deployments, etc. */}
                </SidebarContent>
                 <SidebarFooter className="mt-auto">
                     {/* Footer actions like Collapse/Expand */}
                 </SidebarFooter>
            </Sidebar>

             {/* Main Editing and Control Area */}
            <SidebarInset>
                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden gap-1 md:gap-2 p-2">
                 {/* Left Column: Controls */}
                 <div className="w-full lg:w-1/3 flex flex-col gap-2 md:gap-3 border border-border p-2 md:p-3 rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] overflow-y-auto min-h-[300px] lg:min-h-0">
                    {/* Model Selector */}
                    <div className="space-y-1">
                       <Label htmlFor="model-select" className="text-sm font-medium text-secondary font-mono flex items-center">
                         &gt; Select_AI_Model:
                          <Tooltip>
                             <TooltipTrigger asChild>
                                <button onClick={fetchAndCombineModels} disabled={isLoadingModels || isLoadingGeneration} className="ml-2 text-xs text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed p-0.5 rounded border border-transparent hover:border-accent">
                                   <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                </button>
                             </TooltipTrigger>
                             <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground border-border rounded-none">
                                <p>Refresh AI Model List</p>
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
                                  <button onClick={fetchAndCombineModels} className="underline ml-2 font-bold hover:text-destructive/80">(Retry Scan)</button>
                               </AlertDescription>
                            </Alert>
                        ) : (
                          <Select
                            value={selectedModelId ?? ""}
                            onValueChange={(value) => setSelectedModelId(value || undefined)}
                            disabled={isLoadingModels || allModels.length === 0 || isLoadingGeneration}
                          >
                             <SelectTrigger id="model-select" className="w-full bg-input border-border font-mono neon-glow focus:ring-ring focus:border-accent rounded-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed">
                                <SelectValue placeholder={allModels.length === 0 ? "[No Models Available]" : "[Select Model...]"} />
                             </SelectTrigger>
                             <SelectContent className="bg-popover border-border font-mono max-h-[400px] overflow-y-auto rounded-none shadow-[0_0_10px_hsla(var(--ring)/0.3)]">
                               {(Object.keys(groupedModels) as Array<keyof typeof groupedModels>).length > 0 ? (
                                   (Object.keys(groupedModels) as Array<keyof typeof groupedModels>).map((provider) => (
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
                                                  disabled={model.id.startsWith('placeholder-')} // Disable placeholder models
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
                                   ))
                               ) : (
                                   <SelectItem value="no-models" disabled className="font-mono rounded-none text-center py-4">[No Models Detected or Configured]</SelectItem>
                               )}
                             </SelectContent>
                          </Select>
                        )}
                       <p className="text-xs text-muted-foreground font-mono">
                         // Configure API keys in <Button variant="link" className="p-0 h-auto text-xs font-mono text-accent" onClick={() => setIsSettingsOpen(true)}>[Settings]</Button> for cloud models.
                       </p>
                    </div>

                    <Separator className="bg-border/50 my-1"/>

                    {/* Prompt Input */}
                    <div className="flex-grow flex flex-col min-h-[200px]">
                     <PromptInput
                       prompt={prompt}
                       setPrompt={setPrompt}
                       onSubmit={handleInitialGenerate}
                       isLoading={isLoadingGeneration}
                       disabled={isGenerateDisabled}
                       buttonText="Execute_Prompt" // Changed button text
                       textAreaClass="terminal-input flex-grow" // Ensure textarea grows
                       placeholderText="// Input prompt: Describe the application, component, or function to generate or modify...\n// Example: Create a React Button component with hover effects..."
                     />
                    </div>
                     {generationError && !isLoadingGeneration && (
                         <Alert variant="destructive" className="mt-1 bg-destructive/10 border-destructive/50 text-destructive font-mono rounded-none py-1 px-2">
                           <Terminal className="h-4 w-4" />
                           <AlertTitle className="text-sm">! Execution Error !</AlertTitle>
                           <AlertDescription className="text-xs flex justify-between items-center gap-2">
                               <span>{generationError}</span>
                               <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs underline p-0 h-auto hover:bg-destructive/20 flex-shrink-0">
                                   (Retry_Cmd)
                               </Button>
                           </AlertDescription>
                         </Alert>
                     )}
                      {/* Validation Pipeline status */}
                      <div className="text-xs text-muted-foreground font-mono mt-1 border-t border-border/30 pt-1 flex items-center gap-2 flex-wrap">
                         <span className="mr-1 shrink-0 flex items-center">
                             <Workflow className="h-3 w-3 mr-1"/> // Validation_Status:
                         </span>
                         <Badge
                             variant={
                                 validationStatus === "Failed" || validationStatus === "Error" ? "destructive" :
                                 validationStatus.startsWith("Running") || validationStatus.includes("Generating") ? "secondary" :
                                 validationStatus === "Success" ? "default" : // Use default (primary) for success
                                 validationStatus === "Loaded" ? "outline" : // Use outline for Loaded
                                 "outline" // Idle
                             }
                             className={`text-[10px] px-1.5 py-0 rounded-none font-mono transition-all duration-300 ${
                                  validationStatus === "Success" ? 'bg-primary/20 border-primary/50 text-primary' :
                                  validationStatus.startsWith("Running") || validationStatus.includes("Generating") ? 'animate-pulse bg-secondary/20 border-secondary/50 text-secondary' :
                                  validationStatus === "Failed" || validationStatus === "Error" ? 'bg-destructive/10 border-destructive/50 text-destructive' :
                                  'bg-transparent border-muted/50' // Idle & Loaded state
                             }`}
                             >
                              {validationStatus}
                          </Badge>
                           {validationMessage && <span className="text-muted-foreground text-[10px] truncate max-w-[200px]">{validationMessage}</span>}
                           {(validationStatus === "Failed" || validationStatus === "Error") && (
                              <Button variant="link" size="sm" onClick={handleRetry} className="text-xs underline p-0 h-auto text-accent hover:text-accent/80">
                                (Retry)
                              </Button>
                           )}
                      </div>
                 </div>

                 {/* Separator for Layout */}
                 <Separator orientation="vertical" className="hidden lg:block mx-1 h-auto bg-border/30" />
                 <Separator orientation="horizontal" className="lg:hidden my-1 w-auto bg-border/30" />

                 {/* Right Column: Code Output & Actions */}
                 <div className="w-full lg:w-2/3 flex-grow flex flex-col overflow-hidden border border-border rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] min-h-[300px] lg:min-h-0">
                   <CodeDisplay
                      code={generatedCode}
                      title="// Generated_Output_Buffer //"
                      language="typescript" // Default, could be dynamic based on prompt/output
                      isLoading={isLoadingGeneration}
                      containerClassName="flex-grow" // Make code display fill space
                   />
                   {/* Action Buttons */}
                   <div className="p-2 border-t border-border flex justify-end items-center gap-2 flex-shrink-0">
                       {/* File Ops Placeholder */}
                       <Tooltip>
                           <TooltipTrigger asChild>
                               <span tabIndex={0}> {/* Span for tooltip when button disabled */}
                                   <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground rounded-none" disabled>
                                       <FolderTree className="h-3 w-3 mr-1"/> Manage Files...
                                   </Button>
                               </span>
                           </TooltipTrigger>
                           <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground border-border rounded-none">
                               <p>File Explorer / Multi-File Ops (Not Implemented)</p>
                           </TooltipContent>
                       </Tooltip>
                       {/* Edit Button */}
                      <Tooltip>
                         <TooltipTrigger asChild>
                           {/* Wrap button in span for Tooltip when disabled */}
                           <span tabIndex={isEditDisabled ? 0 : -1}>
                              <Button
                                onClick={() => setIsEditPopupOpen(true)}
                                disabled={isEditDisabled}
                                className="btn-neon-secondary font-mono text-xs rounded-none px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-disabled={isEditDisabled} // For accessibility
                              >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit_Code...
                              </Button>
                            </span>
                         </TooltipTrigger>
                          <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground border-border rounded-none max-w-[250px]">
                             <p>{isEditDisabled && (!generatedCode || generatedCode === "// Output buffer empty. Awaiting command...") ? 'Generate code first to enable editing.' : isEditDisabled && isLoadingGeneration ? 'Wait for generation to finish.' : isEditDisabled && (!!generationError || validationStatus === "Failed") ? 'Cannot edit code with errors or validation failures.' : 'Edit the generated code with new instructions.'}</p>
                         </TooltipContent>
                      </Tooltip>
                    </div>
                 </div>

                 {/* --- Conceptual Panels (Right Sidebar - Placeholders - Kept hidden for now) --- */}
                 {/*
                 <Separator orientation="vertical" className="hidden lg:block h-auto bg-border/30 mx-1" />
                 <div className="hidden xl:flex xl:w-1/5 flex-col border border-border p-2 rounded-sm bg-card/50 overflow-hidden space-y-3">
                     <div className="flex flex-col flex-1 overflow-hidden">
                         <h3 className="text-sm font-mono text-secondary mb-1 flex items-center shrink-0"><Bot className="h-4 w-4 mr-1"/> AI_Agents</h3>
                         <div className="flex-grow overflow-auto text-xs text-muted-foreground font-mono space-y-1 p-1 bg-black/20 rounded-sm border border-border/20">
                             <p>// Code Assistant: <span className="text-green-400/80">[Ready]</span></p>
                             <p>// Project Architect: <span className="text-yellow-400/80">[Idle]</span></p>
                             <p className="text-yellow-500/70 block mt-2">// (Agent Chat & Task Assignment Not Implemented)</p>
                         </div>
                     </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                         <h3 className="text-sm font-mono text-secondary mb-1 pt-1 border-t border-border/30 flex items-center shrink-0"><Info className="h-4 w-4 mr-1"/> System_Integrations</h3>
                         <div className="flex-grow overflow-auto text-xs text-muted-foreground font-mono space-y-0.5 p-1 bg-black/20 rounded-sm border border-border/20">
                             <p>// <ShieldCheck className="inline h-3 w-3 mr-1"/> Security Scan: <span className="text-yellow-500/70">[Offline]</span></p>
                             <p>// <TestTubeDiagonal className="inline h-3 w-3 mr-1"/> MLOps Monitor: <span className="text-yellow-500/70">[Offline]</span></p>
                             <p>// <Users className="inline h-3 w-3 mr-1"/> Collaboration: <span className="text-yellow-500/70">[Offline]</span></p>
                              <p>// <GitBranch className="inline h-3 w-3 mr-1"/> Git Sync: <span className="text-yellow-500/70">[Offline]</span></p>
                              <p>// <CloudCog className="inline h-3 w-3 mr-1"/> Deployments: <span className="text-yellow-500/70">[Offline]</span></p>
                             <p className="text-yellow-500/70 block mt-2">// (Integrations Not Implemented)</p>
                         </div>
                      </div>
                 </div>
                 */}
                 {/* --- End Conceptual Panels --- */}

                </main>

                 {/* Footer */}
                 <footer className="pt-1 mt-auto border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
                 [ CodeSynth IDE v0.2 | Active Models: {getProviderNames(allModels)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
               </footer>
             </SidebarInset>
        </div>


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
   </SidebarProvider>
   </TooltipProvider>
  );
}

// Helper function to get unique provider names from the model list
function getProviderNames(models: CombinedModel[]): string {
    if (!models || models.length === 0) return "None Loaded";
    // Filter out potential placeholder models if they exist
    const actualModels = models.filter(m => !m.id.startsWith('placeholder-'));
    if (actualModels.length === 0) return "None Configured/Available";

    const providers = new Set(actualModels.map(m => m.provider));
    const providerList = Array.from(providers);

    // Sort providers for consistent display
    providerList.sort((a, b) => {
       const order = ['Ollama', 'Google AI', 'OpenRouter', 'Hugging Face'];
       return order.indexOf(a) - order.indexOf(b);
    });

    if (providerList.length > 3) return `${providerList.slice(0, 3).join('/')} + Others`;
    return providerList.join(' | ');
}


// Dummy toastTimeouts map definition (replace with actual export/import if needed)
// This logic is typically handled within the useToast hook itself.
// const toastTimeouts = new Map<string, NodeJS.Timeout>();
