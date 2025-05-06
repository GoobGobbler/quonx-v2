"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic'; // Import next/dynamic
import { generateCodeFromPrompt, type GenerateCodeFromPromptInput } from "@/ai/flows/generate-code-from-prompt";
import { PromptInput } from "@/components/prompt-input";
// import { CodeDisplay } from "@/components/code-display"; // Comment out static import
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, RefreshCw, Server, BrainCircuit, X, Pencil, Settings, Users, ShieldCheck, GitBranch, CloudCog, FolderTree, MessageSquare, Info, Box, Bot, Construction, HardDrive, Workflow, TestTubeDiagonal, UserCheck, LayoutPanelLeft, Code, File, Folder, PackageX, Loader2, ListPlus, Binary, Activity } from "lucide-react"; // Added PackageX icon and others
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listLocalOllamaModels, type OllamaModel } from '@/lib/ollama-client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPopup } from "@/components/edit-popup";
import { SettingsPanel, SETTINGS_STORAGE_KEY, AppSettings, defaultSettings } from "@/components/settings-panel"; // Import SettingsPanel and shared types/constants
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Keep for page-specific tooltips if needed
import { Sidebar, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarSeparator, SidebarInput, SidebarInset } from "@/components/ui/sidebar"; // Import Sidebar components, Removed SidebarProvider
import { Progress } from "@/components/ui/progress"; // Import Progress
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion


// Dynamically import CodeDisplay with a loading state
const CodeDisplay = dynamic(
  () => import('@/components/code-display').then((mod) => mod.CodeDisplay),
  {
    ssr: false, // Disable server-side rendering for this component
    loading: () => ( // Optional loading component
        <div className="flex-grow flex flex-col border border-border rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] min-h-[300px] lg:min-h-0 p-4 items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-mono">// Loading Code Buffer...</p>
            <Skeleton className="h-4 w-3/4 mt-4 bg-muted/50" />
            <Skeleton className="h-4 w-5/6 mt-2 bg-muted/50" />
        </div>
    ),
  }
);

// Define structure for combined models list
interface CombinedModel {
  id: string; // Fully qualified name (e.g., "ollama/llama3", "googleai/gemini-1.5-flash")
  name: string; // Display name (e.g., "llama3", "Gemini 1.5 Flash")
  provider: 'Ollama' | 'Google AI' | 'OpenRouter' | 'Hugging Face'; // Expand this as more providers are *actually* configured
  size?: number; // Optional size in bytes (primarily for Ollama)
  description?: string; // Optional description
  unavailable?: boolean; // Flag for unavailable models due to missing plugins
}


// --- Potential Cloud Models (Activated based on Settings, but marked unavailable if plugin missing) ---
const POTENTIAL_CLOUD_MODELS: CombinedModel[] = [
  // Google AI / Gemini Models (Requires GOOGLE_API_KEY in Settings)
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google AI', description: 'Fast, versatile model for general tasks' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google AI', description: 'Most capable model for complex tasks' },
  { id: 'googleai/gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'Google AI', description: 'Vision-capable model (Requires multimodal support)'}, // Added Vision

  // OpenRouter models (Require OPENROUTER_API_KEY, but plugin@1.8.0 is unavailable)
  { id: 'openrouter/anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OR)', provider: 'OpenRouter', description: 'Unavailable (@genkit-ai/openrouter@1.8.0 not found)', unavailable: true },
  { id: 'openrouter/google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (OR)', provider: 'OpenRouter', description: 'Unavailable (@genkit-ai/openrouter@1.8.0 not found)', unavailable: true },
  { id: 'openrouter/meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B (OR)', provider: 'OpenRouter', description: 'Unavailable (@genkit-ai/openrouter@1.8.0 not found)', unavailable: true },
  { id: 'openrouter/mistralai/mistral-large-latest', name: 'Mistral Large (OR)', provider: 'OpenRouter', description: 'Unavailable (@genkit-ai/openrouter@1.8.0 not found)', unavailable: true },
  { id: 'openrouter/microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B (OR)', provider: 'OpenRouter', description: 'Unavailable (@genkit-ai/openrouter@1.8.0 not found)', unavailable: true },

  // Hugging Face models (Require HF_API_KEY, but plugin@1.8.0 is unavailable)
  { id: 'huggingface/codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B (HF)', provider: 'Hugging Face', description: 'Unavailable (@genkit-ai/huggingface@1.8.0 not found)', unavailable: true },
  { id: 'huggingface/meta-llama/Meta-Llama-3-8B-Instruct', name: 'Llama 3 8B Instruct (HF)', provider: 'Hugging Face', description: 'Unavailable (@genkit-ai/huggingface@1.8.0 not found)', unavailable: true }, // Example HF model
];
// --- End Potential Cloud Models ---

// Placeholder function for conceptual validation pipeline
async function runValidationPipeline(code: string, prompt?: string): Promise<{ success: boolean; message?: string; steps?: { name: string; status: 'passed' | 'failed' | 'skipped' }[] }> {
    console.log("Running conceptual validation pipeline...", { codeLength: code.length, prompt });
    // Simulate async work (e.g., calling a linter or test runner)
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    const steps = [
        { name: "Syntax Check", status: Math.random() > 0.05 ? 'passed' : 'failed' as 'passed' | 'failed' },
        { name: "Dependency Check", status: 'skipped' as 'passed' | 'failed' | 'skipped' }, // Placeholder
        { name: "Linter (ESLint)", status: Math.random() > 0.1 ? 'passed' : 'failed' as 'passed' | 'failed' },
        { name: "Security Scan (Snyk)", status: 'skipped' as 'passed' | 'failed' | 'skipped' }, // Placeholder
        { name: "Unit Tests", status: 'skipped' as 'passed' | 'failed' | 'skipped' }, // Placeholder
    ];

    // Determine overall success based on critical steps
    const success = steps.every(step => step.status === 'passed' || step.status === 'skipped');

    const failedStep = steps.find(step => step.status === 'failed');
    const message = success ? "Validation passed (Conceptual)" : `Failed at step: ${failedStep?.name || 'Unknown'}`;

    console.log("Validation Result:", { success, message, steps });
    return { success, message, steps };
}

// File tree node structure
interface FileTreeNode {
    id: string;
    name: string;
    type: 'folder' | 'file';
    path: string; // Full path for easier handling
    children?: FileTreeNode[];
    content?: string; // Optional content for files
}

// Conceptual Task Structure for Agents
interface AgentTask {
    id: string;
    agent: 'Code Assistant' | 'Project Architect';
    status: 'pending' | 'running' | 'completed' | 'failed';
    description: string;
    result?: string; // Output or error message
    progress?: number; // 0-100
}


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
  const [validationSteps, setValidationSteps] = useState<{ name: string; status: 'passed' | 'failed' | 'skipped' }[]>([]);
  const [validationProgress, setValidationProgress] = useState(0); // Track validation progress


  // --- State for Conceptual Features ---
  const [codeAssistantChatVisible, setCodeAssistantChatVisible] = useState(false); // Example state
  const [projectArchitectChatVisible, setProjectArchitectChatVisible] = useState(false); // Example state
  const [activeTab, setActiveTab] = useState<string | null>(null); // Example: Track active file tab
  const [openFiles, setOpenFiles] = useState<string[]>([]); // Example: Track open files

  // Initialize file tree state (Conceptual)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([
      { id: 'src', name: 'src', type: 'folder', path: 'src', children: [
          { id: 'app', name: 'app', type: 'folder', path: 'src/app', children: [
              { id: 'page.tsx', name: 'page.tsx', type: 'file', path: 'src/app/page.tsx', content: '// src/app/page.tsx content...' },
              { id: 'layout.tsx', name: 'layout.tsx', type: 'file', path: 'src/app/layout.tsx', content: '// src/app/layout.tsx content...' },
              { id: 'globals.css', name: 'globals.css', type: 'file', path: 'src/app/globals.css', content: '/* src/app/globals.css content... */' },
          ]},
          { id: 'components', name: 'components', type: 'folder', path: 'src/components', children: [
              { id: 'ui', name: 'ui', type: 'folder', path: 'src/components/ui', children: []},
              { id: 'prompt-input.tsx', name: 'prompt-input.tsx', type: 'file', path: 'src/components/prompt-input.tsx', content: '// src/components/prompt-input.tsx content...' },
          ]},
          { id: 'ai', name: 'ai', type: 'folder', path: 'src/ai', children: []},
          { id: 'lib', name: 'lib', type: 'folder', path: 'src/lib', children: []},
      ]},
      { id: 'public', name: 'public', type: 'folder', path: 'public', children: []},
      { id: 'package.json', name: 'package.json', type: 'file', path: 'package.json', content: '{ "name": "example" }' },
      { id: 'README.md', name: 'README.md', type: 'file', path: 'README.md', content: '# Example README' },
  ]);
  // --- End State for Conceptual Features ---

  // --- State for Agent Tasks (Conceptual) ---
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);

  // Function to add a conceptual task
  const addAgentTask = (agent: 'Code Assistant' | 'Project Architect', description: string) => {
      const newTask: AgentTask = {
          id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          agent,
          status: 'pending',
          description,
          progress: 0,
      };
      setAgentTasks(prev => [...prev, newTask]);
      // Simulate task execution (replace with actual agent calls)
      simulateTaskExecution(newTask.id);
  };

   // Simulate task progress and completion/failure
   const simulateTaskExecution = (taskId: string) => {
       let progress = 0;
       setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'running' } : t));

       const interval = setInterval(() => {
           progress += Math.random() * 20;
           if (progress >= 100) {
               clearInterval(interval);
               const success = Math.random() > 0.2; // 80% success rate
               setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: success ? 'completed' : 'failed', progress: 100, result: success ? 'Task completed successfully (Simulated)' : 'Task failed: Error during processing (Simulated)' } : t));
           } else {
               setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: Math.min(100, Math.round(progress)) } : t));
           }
       }, 500 + Math.random() * 500);
   };
  // --- End State for Agent Tasks ---


  // Fetch local Ollama models and combine with *configured* cloud models based on settings
  const fetchAndCombineModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    dismiss('model-error-toast'); // Dismiss previous error toast immediately
    let localModels: CombinedModel[] = [];
    let ollamaError: string | null = null;
    let configuredCloudModels: CombinedModel[] = [];
    let pluginWarnings: string[] = []; // Reset warnings

    // Load settings from localStorage
    let settings: AppSettings = defaultSettings; // Use AppSettings type from settings-panel
    if (typeof window !== 'undefined') {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                 // Merge defaults with stored settings to handle missing/new keys gracefully
                 settings = { ...defaultSettings, ...parsedSettings };
            }
            // No need for else, settings already initialized with defaults
        } catch (e) {
            console.error("Failed to parse settings from localStorage:", e);
            toast({
                 variant: "destructive",
                 title: "SYS WARN: Settings Load Fail",
                 description: "Could not parse saved settings. Using defaults.",
                 className: "font-mono",
             });
             // Fallback to defaults on parse error (already set)
        }
    }
    // Else: Use default settings if not in browser env (already set)

    // Fetch Ollama models if base URL seems valid
    const ollamaBaseUrl = settings.ollamaBaseUrl; // Use loaded setting
    if (ollamaBaseUrl && ollamaBaseUrl.startsWith('http')) {
        try {
            console.log(`Attempting to fetch Ollama models from: ${ollamaBaseUrl}`);
            const fetchedOllamaModels = await listLocalOllamaModels(ollamaBaseUrl);
            localModels = fetchedOllamaModels.map(m => ({
                id: `ollama/${m.name}`,
                name: m.name.replace(':latest', ''), // Clean up name
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


    // Add cloud models based on potential list and settings availability
    if (settings.googleApiKey) {
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Google AI' && !m.unavailable));
    }
    if (settings.openRouterApiKey) {
        // Add OpenRouter models but keep marked as unavailable if plugin is missing
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'OpenRouter'));
        if (POTENTIAL_CLOUD_MODELS.some(m => m.provider === 'OpenRouter' && m.unavailable)) {
            pluginWarnings.push("OpenRouter integration unavailable (@genkit-ai/openrouter@1.8.0 not found)");
        }
    }
     if (settings.huggingFaceApiKey) {
        // Add Hugging Face models but keep marked as unavailable if plugin is missing
        configuredCloudModels.push(...POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Hugging Face'));
         if (POTENTIAL_CLOUD_MODELS.some(m => m.provider === 'Hugging Face' && m.unavailable)) {
            pluginWarnings.push("HuggingFace integration unavailable (@genkit-ai/huggingface@1.8.0 not found)");
        }
    }


    // Combine available model sources
    const combined = [
        ...(ollamaError ? [] : localModels), // Only include Ollama if no error
        ...configuredCloudModels, // Include cloud models based on key presence and plugin status
    ];
    setAllModels(combined);

    // Filter only AVAILABLE models for selection logic
    const availableModels = combined.filter(m => !m.unavailable);

    // Set a default model intelligently, prioritizing configured cloud models, then Ollama, ONLY from AVAILABLE models
    if (!selectedModelId || !availableModels.some(m => m.id === selectedModelId)) {
        const firstGoogle = availableModels.find(m => m.provider === 'Google AI');
        const firstOllama = availableModels.find(m => m.provider === 'Ollama');
        const newSelectedId = firstGoogle?.id || firstOllama?.id || (availableModels.length > 0 ? availableModels[0].id : undefined);
        setSelectedModelId(newSelectedId);
         console.log("Model selection updated:", newSelectedId ?? "None Available");
    } else if (availableModels.length === 0) {
         setSelectedModelId(undefined); // No available models found
    }

    // Handle errors/warnings more granularly
    let errorMessage = "";
    // Start with plugin warnings if relevant keys are set AND plugins are unavailable
    let warningMessages: string[] = pluginWarnings;

    if (ollamaError) {
        if (availableModels.length > 0) { // Check against AVAILABLE models now
            // Ollama failed, but other *available* models exist: Warning
            warningMessages.push(ollamaError);
        } else {
            // Ollama failed AND no other *available* models: Error
             errorMessage = `${ollamaError}. No other providers configured/available. Check Settings.`;
        }
    } else if (availableModels.length === 0) {
        // No Ollama error, but list is empty OR all models are unavailable
         const missingKeys = [
             !settings.googleApiKey && "Google AI",
             !settings.openRouterApiKey && "OpenRouter",
             !settings.huggingFaceApiKey && "Hugging Face"
         ].filter(Boolean).join(', ');
         errorMessage = `No available AI models found. Check Ollama status. For cloud models, configure API keys in Settings (${missingKeys ? `Missing: ${missingKeys}` : ''}) and ensure required plugins are installed.`;
    }

    // Display warnings as non-destructive toasts
    if (warningMessages.length > 0) {
        toast({
            id: 'model-warning-toast',
            variant: "default", // Use default variant, potentially styled
            title: "SYS WARN: Model Configuration",
            description: warningMessages.join('; '),
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

    // Check if the selected model is marked as unavailable
    const selectedModel = allModels.find(m => m.id === selectedModelId);
    if (selectedModel?.unavailable) {
        const errorMsg = `Model "${selectedModel.name}" (${selectedModel.provider}) is unavailable due to missing plugin. Check settings or install required package.`;
        setGenerationError(errorMsg);
        toast({ variant: "destructive", title: "ERR: Model Unavailable", description: errorMsg, className: "font-mono" });
        return;
    }

    setIsLoadingGeneration(true);
    setGenerationError(null); // Clear previous errors
    setValidationStatus("Running Pre-Validation...");
    setValidationMessage("Checking input parameters...");
    setValidationProgress(0); // Reset progress
    setValidationSteps([]); // Clear previous steps
    toast({ title: "STATUS: Pre-Validation", description: "Checking input...", className: "font-mono text-xs" });


    // Conceptual Pre-generation validation (can be expanded)
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate quick check
    setValidationProgress(50);
    const preValidationResult = { success: true }; // Simplified pre-check
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
    setValidationMessage(`Using model: ${selectedModel?.name || selectedModelId}`);
    setValidationProgress(100); // Pre-validation complete
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
      setValidationProgress(0); // Reset for post-validation

      // Run post-generation validation pipeline (Conceptual)
      let currentStep = 0;
      const totalSteps = 5; // From the conceptual pipeline
      const interval = setInterval(async () => {
          currentStep++;
          setValidationProgress(Math.round((currentStep / totalSteps) * 100));
          if (currentStep >= totalSteps) {
              clearInterval(interval);
              const postValidationResult = await runValidationPipeline(result.code);
              setValidationSteps(postValidationResult.steps || []); // Update steps state

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
                  setIsLoadingGeneration(false);
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

                  toast({
                    title: "STATUS: Generation OK",
                    description: `Code generated with ${selectedModel?.name || selectedModelId}. Validation passed.`,
                    className: "font-mono border-primary text-primary",
                  });
                  setIsLoadingGeneration(false);
                   // Reset status after a delay on success
                  setTimeout(() => {
                      if (validationStatus === "Success") { // Check if still success
                          setValidationStatus("Idle");
                          setValidationMessage(undefined);
                          setValidationSteps([]);
                          setValidationProgress(0);
                      }
                  }, 5000);
              }
          }
      }, 150); // Simulate step-by-step validation


    } catch (err) {
      console.error("Code generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred during generation.";
      setGenerationError(errorMessage);
      setValidationStatus("Error"); // Set status to Error
      setValidationMessage(errorMessage.substring(0, 100) + "..."); // Show snippet of error
      setValidationSteps([]); // Clear steps on error
      setValidationProgress(0);
      toast({
        variant: "destructive",
        title: "ERR: Generation Failed",
        description: errorMessage,
        className: "font-mono",
        duration: 15000, // Show error for longer
      });
      // Keep previous code state intact on error
      setIsLoadingGeneration(false);
    }
    // Don't reset validation status automatically on fail/error in the 'finally' block
    // Handled within try/catch now
  };

  // Wrapper for initial generation from main prompt
  const handleInitialGenerate = () => {
      handleGenerate(prompt);
      // Example: Add task to Project Architect (Conceptual)
      addAgentTask('Project Architect', `Scaffold project based on prompt: "${prompt.substring(0, 50)}..."`);
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
      // Example: Add task to Code Assistant (Conceptual)
      addAgentTask('Code Assistant', `Edit code based on instructions: "${editPrompt.substring(0, 50)}..."`);
  };

  // Handler for the retry button in the error alert or validation failed state
  const handleRetry = () => {
       if (prompt || previousSuccessfulCode) { // Allow retry even if prompt is empty if there's previous code
           handleGenerate(prompt, previousSuccessfulCode); // Retry with current prompt and last good code
           addAgentTask('Project Architect', `Retry generation for prompt: "${prompt.substring(0, 50)}..."`); // Example task
       } else {
           toast({ variant: "destructive", title: "ERR: Nothing to Retry", description: "Enter a prompt or load previous code.", className: "font-mono" });
       }
  };


  const getProviderIcon = (provider: CombinedModel['provider'], unavailable?: boolean) => {
      const baseClasses = "h-4 w-4 mr-2 flex-shrink-0";
      if (unavailable) {
          return <PackageX className={cn(baseClasses, "text-destructive")} title={`${provider} (Plugin Unavailable)`} />;
      }
      switch (provider) {
          case 'Ollama': return <HardDrive className={cn(baseClasses, "text-secondary")} title="Ollama (Local)" />;
          case 'Google AI': return <BrainCircuit className={cn(baseClasses, "text-primary")} title="Google AI" />;
          case 'OpenRouter': return <CloudCog className={cn(baseClasses, "text-purple-400")} title="OpenRouter" />; // Style assumes available
          case 'Hugging Face': return <Binary className={cn(baseClasses, "text-yellow-400")} title="Hugging Face" />; // Use Binary icon
          default: return <Box className={cn(baseClasses, "text-muted-foreground")} title="Unknown Provider" />;
      }
  };

  // Group models by provider for the Select component
  const groupedModels = allModels.reduce((acc, model) => {
      const provider = model.provider;
      // Initialize provider array if it doesn't exist
      if (!acc[provider]) {
          acc[provider] = [];
      }
      // Ensure no duplicates (based on ID)
      if (!acc[provider].some(existingModel => existingModel.id === model.id)) {
           acc[provider].push(model);
      }
      return acc;
  }, {} as Record<CombinedModel['provider'], CombinedModel[]>);


  // Determine button disabled states
  const isGenerateDisabled = isLoadingGeneration || isLoadingModels || !selectedModelId || !prompt.trim();
  // Disable edit if loading, no code exists, or if there was a generation error OR validation failure
  const isEditDisabled = isLoadingGeneration || !generatedCode || generatedCode === "// Output buffer empty. Awaiting command..." || !!generationError || validationStatus === "Failed";


  // Helper function to recursively render file tree with interactive elements
  const renderFileTree = (nodes: FileTreeNode[], level = 0): React.ReactNode => {
      return nodes.map(node => (
          <AccordionItem value={node.id} key={node.id} className="border-none">
              <div className={`flex items-center group ml-${level * 2}`}> {/* Indentation */}
                  {node.type === 'folder' && node.children && node.children.length > 0 ? (
                       <AccordionTrigger className="flex-grow p-0 hover:no-underline">
                           <SidebarMenuButton
                               size="sm"
                               className="w-full justify-start hover:bg-transparent data-[state=open]:bg-accent/10"
                               tooltip={node.path}
                               asChild
                           >
                             <div> {/* Wrap content for proper layout */}
                               <Folder className="text-accent group-data-[state=open]:text-accent/80 mr-1.5" />
                               <span className="truncate">{node.name}</span>
                             </div>
                           </SidebarMenuButton>
                       </AccordionTrigger>
                  ) : (
                      <SidebarMenuButton
                          size="sm"
                          className="w-full justify-start flex-grow"
                          tooltip={node.path}
                          isActive={activeTab === node.id}
                          onClick={() => {
                              if (node.type === 'file') {
                                  setActiveTab(node.id);
                                  if (!openFiles.includes(node.id)) {
                                      setOpenFiles(prev => [...prev, node.id]);
                                  }
                                  // Load file content into the editor (conceptual)
                                  setGeneratedCode(node.content || `// Content for ${node.path}`);
                                  setValidationStatus("Loaded");
                                  setValidationMessage(`Loaded file: ${node.name}`);
                                  console.log("Open file:", node.path);
                              }
                          }}
                      >
                          <File className="text-secondary mr-1.5"/>
                          <span className="truncate">{node.name}</span>
                      </SidebarMenuButton>
                  )}
                   {/* Add File/Folder Actions (Conceptual) */}
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1 flex gap-0.5">
                       <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 p-0.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-none" onClick={() => console.log('Add File to:', node.path)}>
                                    <ListPlus className="h-3 w-3"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-mono text-xs">Add File</TooltipContent>
                       </Tooltip>
                        {node.type === 'folder' && (
                           <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-none" onClick={() => console.log('Add Folder to:', node.path)}>
                                        <Folder className="h-3 w-3"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-mono text-xs">Add Folder</TooltipContent>
                           </Tooltip>
                        )}
                   </div>
              </div>
              {node.type === 'folder' && node.children && node.children.length > 0 && (
                  <AccordionContent className="p-0 overflow-hidden">
                       {renderFileTree(node.children, level + 1)}
                  </AccordionContent>
              )}
          </AccordionItem>
      ));
  };

  // Find content of the active file tab
  const findFileContent = (nodes: FileTreeNode[], targetId: string | null): string | undefined => {
      if (!targetId) return undefined;
      for (const node of nodes) {
          if (node.type === 'file' && node.id === targetId) {
              return node.content;
          }
          if (node.type === 'folder' && node.children) {
              const found = findFileContent(node.children, targetId);
              if (found !== undefined) return found;
          }
      }
      return undefined;
  };
  const activeFileContent = activeTab ? findFileContent(fileTree, activeTab) : generatedCode;


  // Render Agent Tasks
  const renderAgentTasks = () => {
      if (agentTasks.length === 0) {
          return <p className="text-xs text-muted-foreground italic px-2">// No active agent tasks.</p>;
      }
      return agentTasks.map(task => (
          <div key={task.id} className="p-2 border-b border-border/20 text-xs font-mono">
               <div className="flex justify-between items-center mb-1">
                   <span className="font-medium text-secondary flex items-center">
                       {task.agent === 'Code Assistant' ? <Bot className="h-3 w-3 mr-1"/> : <Construction className="h-3 w-3 mr-1"/>}
                       {task.agent}
                   </span>
                   <Badge
                       variant={task.status === 'completed' ? 'default' : task.status === 'failed' ? 'destructive' : 'secondary'}
                       className={`text-[10px] px-1.5 py-0 rounded-none capitalize ${task.status === 'running' ? 'animate-pulse' : ''} ${task.status === 'completed' ? 'bg-primary/20 border-primary/50 text-primary' : ''}`}
                   >
                       {task.status}
                   </Badge>
               </div>
               <p className="text-muted-foreground truncate mb-1" title={task.description}>{task.description}</p>
               {task.status === 'running' && task.progress !== undefined && (
                   <Progress value={task.progress} className="h-1 w-full bg-muted/30" indicatorClassName="bg-secondary"/>
               )}
               {task.result && <p className={`mt-1 text-[10px] ${task.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{task.result}</p>}
          </div>
      ));
  };

  return (
    // Remove TooltipProvider and SidebarProvider wrappers - handled in layout
       <div className="flex flex-col h-screen bg-background text-foreground p-1 md:p-2 border-2 border-border shadow-[inset_0_0_10px_hsla(var(--foreground)/0.1)] rounded-sm overflow-hidden">
       {/* Header */}
       <header className="p-2 border-b-2 border-border mb-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
              {/* Sidebar Trigger */}
                <SidebarTrigger className="md:hidden" /> {/* Only show on mobile */}
               <Terminal className="h-6 w-6 text-primary hidden sm:block"/>
              <div>
                 <h1 className="text-lg md:text-xl font-bold text-primary font-mono chromatic-aberration-light" data-text="CodeSynth_IDE">CodeSynth_IDE</h1>
                 <p className="text-xs md:text-sm text-muted-foreground font-mono">// Multi-Agent Development Environment v0.5</p> {/* Version Bump */}
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
                          {(isLoadingGeneration || isLoadingModels || validationStatus.startsWith('Running')) && <div className="absolute w-4 h-4 bg-current/30 rounded-full animate-ping"></div>}
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
                           validationStatus === "Loaded" ? 'File/Buffer Loaded' :
                           validationStatus.startsWith("Running") ? validationStatus :
                           'System Idle / Ready'}
                       </p>
                  </TooltipContent>
             </Tooltip>
           </div>
       </header>

       {/* Main Content Area with Sidebar */}
        <div className="flex-grow flex overflow-hidden">
            <Sidebar side="left" collapsible="icon" className="border-r-2 border-border"> {/* Added border */}
                <SidebarHeader>
                     {/* Sidebar Toggle Button for Desktop */}
                     <div className="flex items-center justify-between">
                        <h2 className="font-mono text-sm text-secondary group-data-[collapsible=icon]:hidden transition-opacity duration-200 ease-linear">// Workspace</h2>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground p-1 hover:bg-accent/10 rounded-none hidden md:inline-flex" onClick={() => document.cookie = `${SETTINGS_STORAGE_KEY}=${JSON.stringify({...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')})}; path=/; max-age=0` /* Conceptual: Needs proper toggle logic via useSidebar */}>
                                    <LayoutPanelLeft className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-mono text-xs">Collapse Sidebar</TooltipContent>
                         </Tooltip>
                     </div>
                    <SidebarInput placeholder="Search files..." className="group-data-[collapsible=icon]:hidden transition-opacity duration-200 ease-linear"/>
                </SidebarHeader>
                <SidebarContent className="p-0">
                    <Accordion type="multiple" className="w-full">
                        <AccordionItem value="file-explorer">
                             <AccordionTrigger className="px-2 py-1 hover:no-underline hover:bg-accent/5 text-xs font-mono text-muted-foreground">
                                 // File_Explorer
                             </AccordionTrigger>
                             <AccordionContent className="pb-0">
                                {renderFileTree(fileTree)}
                             </AccordionContent>
                        </AccordionItem>

                         <AccordionItem value="ai-agents">
                             <AccordionTrigger className="px-2 py-1 hover:no-underline hover:bg-accent/5 text-xs font-mono text-muted-foreground">
                                // AI_Agents ({agentTasks.filter(t => t.status === 'running').length} Running)
                             </AccordionTrigger>
                             <AccordionContent className="pb-0 space-y-1 max-h-[300px] overflow-y-auto">
                                 {/* Conceptual Agent Toggles */}
                                 <div className="flex gap-1 px-2 py-1 group-data-[collapsible=icon]:hidden">
                                     <Button size="sm" variant="ghost" className="flex-1 text-xs justify-start p-1 h-auto font-mono hover:bg-accent/10" onClick={() => setCodeAssistantChatVisible(prev => !prev)}><Bot className="mr-1 h-3 w-3"/>Code Asst.</Button>
                                     <Button size="sm" variant="ghost" className="flex-1 text-xs justify-start p-1 h-auto font-mono hover:bg-accent/10" onClick={() => setProjectArchitectChatVisible(prev => !prev)}><Construction className="mr-1 h-3 w-3"/>Architect</Button>
                                 </div>
                                 {renderAgentTasks()}
                             </AccordionContent>
                         </AccordionItem>

                         <AccordionItem value="integrations">
                             <AccordionTrigger className="px-2 py-1 hover:no-underline hover:bg-accent/5 text-xs font-mono text-muted-foreground">
                                // System_Integrations
                             </AccordionTrigger>
                             <AccordionContent className="pb-0 px-2 space-y-1 group-data-[collapsible=icon]:hidden">
                                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1"><ShieldCheck className="h-3 w-3"/> Security Scan: <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded-none">Offline</Badge></p>
                                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1"><TestTubeDiagonal className="h-3 w-3"/> MLOps Monitor: <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded-none">Offline</Badge></p>
                                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1"><GitBranch className="h-3 w-3"/> Git Sync: <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded-none">Offline</Badge></p>
                                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1"><CloudCog className="h-3 w-3"/> Deployments: <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded-none">Offline</Badge></p>
                                <p className="text-xs text-destructive/80 font-mono mt-1 italic">// (Integrations Not Implemented)</p>
                             </AccordionContent>
                         </AccordionItem>
                    </Accordion>

                </SidebarContent>
                 <SidebarFooter className="mt-auto p-2 border-t-2 border-border group-data-[collapsible=icon]:hidden transition-opacity duration-200 ease-linear">
                     {/* Footer actions like User profile, help, etc. */}
                     <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-mono"><UserCheck className="mr-1 h-3 w-3"/> User Profile (N/A)</Button>
                 </SidebarFooter>
            </Sidebar>

             {/* Main Editing and Control Area */}
            <SidebarInset> {/* This component handles the main content area spacing */}
                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden gap-1 md:gap-2 p-2">
                 {/* Left Column: Controls & Validation Status */}
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
                        ) : modelError && allModels.filter(m => !m.unavailable).length === 0 ? ( // Check only available models for error display trigger
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
                                <SelectValue placeholder={allModels.filter(m => !m.unavailable).length === 0 ? "[No Models Available]" : "[Select Model...]"} />
                             </SelectTrigger>
                             <SelectContent className="bg-popover border-border font-mono max-h-[400px] overflow-y-auto rounded-none shadow-[0_0_10px_hsla(var(--ring)/0.3)]">
                               {(Object.keys(groupedModels) as Array<keyof typeof groupedModels>).length > 0 ? (
                                   (Object.keys(groupedModels) as Array<keyof typeof groupedModels>).map((provider) => (
                                       <SelectGroup key={provider}>
                                           <SelectLabel className="text-xs text-muted-foreground flex items-center pl-2 pr-2 py-1 font-mono">
                                               {/* Check first model in group for unavailable flag */}
                                               {getProviderIcon(provider as CombinedModel['provider'], groupedModels[provider]?.some(m => m.unavailable))}
                                               // {provider}_Models //
                                           </SelectLabel>
                                           {groupedModels[provider].map((model) => (
                                               <SelectItem
                                                  key={model.id}
                                                  value={model.id}
                                                  className={cn(
                                                    "cursor-pointer hover:bg-accent/20 focus:bg-accent/30 font-mono pl-8 rounded-none data-[state=checked]:bg-primary/80 data-[state=checked]:text-primary-foreground flex flex-col items-start",
                                                    model.unavailable && "opacity-50 cursor-not-allowed text-muted-foreground"
                                                  )}
                                                  disabled={model.unavailable} // Disable unavailable models
                                               >
                                                   <div className="flex items-center justify-between w-full">
                                                       <span className="truncate">{model.name}</span>
                                                       {model.size && !model.unavailable && (
                                                         <Badge variant="outline" className="ml-2 text-xs px-1 py-0 border-muted text-muted-foreground bg-transparent rounded-none flex-shrink-0">
                                                             {(model.size / 1e9).toFixed(2)} GB
                                                         </Badge>
                                                       )}
                                                        {model.unavailable && (
                                                            <Badge variant="destructive" className="ml-2 text-[9px] px-1 py-0 rounded-none flex-shrink-0">Unavailable</Badge>
                                                        )}
                                                   </div>
                                                   {model.description && (
                                                     <p className={cn("text-xs mt-0.5 font-mono truncate w-full", model.unavailable ? "text-destructive/80" : "text-muted-foreground")}>
                                                        {model.description}
                                                     </p>
                                                    )}
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

                     {/* Validation Pipeline status & Error */}
                      <div className="text-xs text-muted-foreground font-mono mt-1 border-t border-border/30 pt-2 flex flex-col gap-2">
                         <div className="flex items-center gap-2 flex-wrap">
                             <span className="mr-1 shrink-0 flex items-center">
                                <Activity className="h-3 w-3 mr-1"/> // Pipeline_Status:
                             </span>
                             <Badge
                                 variant={
                                     validationStatus === "Failed" || validationStatus === "Error" ? "destructive" :
                                     validationStatus.startsWith("Running") || validationStatus.includes("Generating") ? "secondary" :
                                     validationStatus === "Success" ? "default" :
                                     validationStatus === "Loaded" ? "outline" :
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
                          {/* Progress Bar for Validation */}
                          {(validationStatus.startsWith("Running") || validationStatus.includes("Generating")) && (
                              <Progress value={validationProgress} className="h-1 w-full bg-muted/30" indicatorClassName="bg-secondary" />
                          )}
                          {/* Display Validation Steps */}
                          {validationSteps.length > 0 && (
                              <div className="text-[10px] space-y-0.5 mt-1 border border-dashed border-border/30 p-1.5 rounded-sm">
                                  {validationSteps.map((step, index) => (
                                      <div key={index} className={`flex items-center gap-1 ${
                                          step.status === 'failed' ? 'text-destructive' :
                                          step.status === 'skipped' ? 'text-muted-foreground/70 italic' :
                                          'text-primary/90' // Passed
                                      }`}>
                                          {step.status === 'passed' ? <Check className="h-2.5 w-2.5"/> : step.status === 'failed' ? <X className="h-2.5 w-2.5"/> : <span className="w-2.5 h-2.5 text-center">-</span>}
                                          <span>{step.name}: {step.status}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                         {/* Generation Error Display */}
                         {generationError && !isLoadingGeneration && (
                             <Alert variant="destructive" className="mt-1 bg-destructive/10 border-destructive/50 text-destructive font-mono rounded-none py-1 px-2">
                               <Terminal className="h-4 w-4" />
                               <AlertTitle className="text-sm">! Execution Error !</AlertTitle>
                               <AlertDescription className="text-xs flex justify-between items-center gap-2">
                                   <span className="overflow-hidden text-ellipsis">{generationError}</span>
                                   <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs underline p-0 h-auto hover:bg-destructive/20 flex-shrink-0">
                                       (Retry_Cmd)
                                   </Button>
                               </AlertDescription>
                             </Alert>
                         )}
                      </div>
                 </div>

                 {/* Separator for Layout */}
                 <Separator orientation="vertical" className="hidden lg:block mx-1 h-auto bg-border/30" />
                 <Separator orientation="horizontal" className="lg:hidden my-1 w-auto bg-border/30" />

                 {/* Right Column: Code Output & Actions */}
                 <div className="w-full lg:w-2/3 flex-grow flex flex-col overflow-hidden border border-border rounded-sm shadow-[inset_0_0_5px_hsla(var(--border)/0.2)] min-h-[300px] lg:min-h-0">
                   {/* Conceptual Tabs for Open Files */}
                   <div className="flex border-b border-border flex-shrink-0">
                       {openFiles.map(fileId => {
                            const file = fileTree.flatMap(f => f.children ? [f, ...f.children] : [f]).find(f => f.id === fileId); // Basic find
                            const fileName = file?.name || fileId;
                            return (
                                <Button
                                    key={fileId}
                                    variant={activeTab === fileId ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-7 px-2 py-0 text-xs font-mono rounded-none border-r border-border ${activeTab === fileId ? 'bg-secondary/80 text-secondary-foreground' : 'text-muted-foreground'}`}
                                    onClick={() => {
                                        setActiveTab(fileId);
                                        const content = file?.content || `// Content for ${fileName}`;
                                        setGeneratedCode(content);
                                        setValidationStatus("Loaded");
                                        setValidationMessage(`Switched to tab: ${fileName}`);
                                     }}
                                >
                                    {fileName}
                                    <X className="h-3 w-3 ml-1.5 opacity-50 hover:opacity-100" onClick={(e) => {
                                        e.stopPropagation(); // Prevent activating tab
                                        setOpenFiles(prev => prev.filter(id => id !== fileId));
                                        if (activeTab === fileId) {
                                            // If closing active tab, switch to another or clear editor
                                            const nextTab = openFiles.filter(id => id !== fileId)[0];
                                            setActiveTab(nextTab || null);
                                            const nextFile = nextTab ? fileTree.flatMap(f => f.children ? [f, ...f.children] : [f]).find(f => f.id === nextTab) : null;
                                            setGeneratedCode(nextFile?.content || (nextTab ? `// Content for ${nextFile?.name}` : "// Output buffer empty..."));
                                        }
                                    }}/>
                                </Button>
                            );
                       })}
                       {/* Add a default tab if needed, or show placeholder */}
                       {openFiles.length === 0 && (
                            <div className="px-2 py-1 text-xs italic text-muted-foreground">// No files open</div>
                       )}
                   </div>

                   <CodeDisplay
                      code={activeFileContent || "// Select a file or generate code..."} // Display active file content or generated code
                      title={`// ${activeTab ? fileTree.find(f => f.id === activeTab)?.path || 'Generated_Output_Buffer' : 'Generated_Output_Buffer'} //`}
                      language="typescript" // Default, could be dynamic based on file extension
                      isLoading={isLoadingGeneration && !activeTab} // Only show loading overlay if generating, not just switching tabs
                      containerClassName="flex-grow" // Make code display fill space
                   />
                   {/* Action Buttons */}
                   <div className="p-2 border-t border-border flex justify-end items-center gap-2 flex-shrink-0">
                       {/* Placeholder for future actions like Deploy, Commit, etc. */}
                       <Tooltip>
                           <TooltipTrigger asChild>
                               <span tabIndex={0}>
                                   <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground rounded-none" disabled>
                                       <GitBranch className="h-3 w-3 mr-1"/> Commit (N/A)
                                   </Button>
                               </span>
                           </TooltipTrigger>
                           <TooltipContent side="top" className="font-mono text-xs">(Git Integration Not Implemented)</TooltipContent>
                       </Tooltip>
                       <Tooltip>
                           <TooltipTrigger asChild>
                               <span tabIndex={0}>
                                   <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground rounded-none" disabled>
                                       <CloudCog className="h-3 w-3 mr-1"/> Deploy (N/A)
                                   </Button>
                               </span>
                           </TooltipTrigger>
                           <TooltipContent side="top" className="font-mono text-xs">(Deployment Not Implemented)</TooltipContent>
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
                </main>

                 {/* Footer */}
                 <footer className="pt-1 mt-auto border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
                 [ CodeSynth IDE v0.5 | Active Providers: {getProviderNames(allModels)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
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
  );
}

// Helper function to get unique provider names from the model list (only counts AVAILABLE providers)
function getProviderNames(models: CombinedModel[]): string {
    if (!models || models.length === 0) return "None Loaded";
    // Filter out unavailable models first
    const availableModels = models.filter(m => !m.unavailable);
    if (availableModels.length === 0) return "None Available";

    const providers = new Set(availableModels.map(m => m.provider));
    const providerList = Array.from(providers);

    // Sort providers for consistent display
    providerList.sort((a, b) => {
       const order = ['Ollama', 'Google AI', 'OpenRouter', 'Hugging Face']; // Maintain full order even if some are unavailable
       return order.indexOf(a) - order.indexOf(b);
    });

    if (providerList.length > 3) return `${providerList.slice(0, 3).join('/')} + Others`;
    return providerList.join(' | ');
}

