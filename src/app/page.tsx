
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrainCircuit, Code, Construction, FileCode2, GitBranch, HardDrive, LayoutDashboard,
  LayoutPanelLeft, ListChecks, LucideIcon, Palette, Rocket, Settings, Terminal, Users,
  CloudCog, Binary, RefreshCcw, ListTree, Cloud, TestTube2, ShieldCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getProviderNames } from "@/lib/utils"; // Import getProviderNames
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeDisplay } from "@/components/code-display";
import { PromptInput } from "@/components/prompt-input";
import { EditPopup } from "@/components/edit-popup";
import { AppSettings, defaultSettings, SETTINGS_STORAGE_KEY } from '@/components/settings-panel';
import { SettingsPanel } from '@/components/settings-panel';
import { useToast } from "@/hooks/use-toast";
import { listLocalOllamaModels } from '@/lib/ollama-client';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateCodeFromPrompt } from '@/ai/flows/generate-code-from-prompt';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Button as ButtonShad } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label as LabelShad } from "@/components/ui/label";
import { Input as InputShad } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation'
import { Skeleton as SkeletonShad } from "@/components/ui/skeleton";


type ModelMetadata = {
    id: string;
    provider: string;
    name: string;
    unavailable?: boolean; // To mark plugins that are known to be missing/non-functional
};
type CombinedModel = {
    id: string;
    provider: string;
    name: string;
};

// Hardcoded model metadata for cloud providers.
const POTENTIAL_CLOUD_MODELS: ModelMetadata[] = [
    { id: 'googleai/gemini-1.5-flash-latest', provider: 'Google AI', name: 'Gemini 1.5 Flash (Cloud)' },
    { id: 'googleai/gemini-1.5-pro-latest', provider: 'Google AI', name: 'Gemini 1.5 Pro (Cloud)' },
    // Mark OpenRouter and HuggingFace as unavailable if their plugins are indeed missing/commented out in genkit.ts
    { id: 'openrouter/anthropic/claude-3-haiku', provider: 'OpenRouter', name: 'Claude 3 Haiku (OpenRouter)', unavailable: true }, // Example: Assume unavailable
    { id: 'huggingface/codellama/CodeLlama-7b-hf', provider: 'Hugging Face', name: 'CodeLlama-7b-hf (HF)', unavailable: true }, // Example: Assume unavailable
];

// Conceptual: Define Agent types if we build specific UIs for them
interface Agent {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    capabilities: string[]; // e.g., ['code_generation', 'refactoring', 'documentation']
}

const AVAILABLE_AGENTS: Agent[] = [
    {
        id: 'code-assistant',
        name: 'Code Assistant',
        description: 'Handles snippet generation, inline refactoring, documentation, and lint fixes.',
        icon: Code,
        capabilities: ['code_generation', 'refactoring', 'documentation', 'lint_fix', 'test_generation'],
    },
    {
        id: 'project-architect',
        name: 'Project Architect',
        description: 'Plans and scaffolds modules, CI/CD pipelines, infrastructure-as-code, and large-scale refactors.',
        icon: Construction,
        capabilities: ['module_scaffolding', 'cicd_planning', 'iac_generation', 'refactor_large_scale'],
    },
    // Add more agents like 'SecurityAnalyst', 'FirebaseExpert', etc.
];


export default function Home() {
    const [prompt, setPrompt] = useState<string>("// Enter prompt: Describe application, file structure, features...");
    const [code, setCode] = useState<string>(""); // Initialize with empty string instead of null
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditPopupOpen, setIsEditPopupOpen] = useState<boolean>(false);
    const [editPrompt, setEditPrompt] = useState<string>(''); // State for the edit prompt itself
    const [allModels, setAllModels] = useState<CombinedModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('googleai/gemini-1.5-flash-latest');
    const [previousCode, setPreviousCode] = useState<string | null>(null);
    const [ollamaModels, setOllamaModels] = useState<any[]>([]);
    const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
    const { toast } = useToast();
    const [modelError, setModelError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [validationStatus, setValidationStatus] = useState<string>("VALIDATION_OK"); // More descriptive status
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const settingsButtonRef = useRef(null);

    // --- Agent Specific State (Conceptual) ---
    const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
    const [agentChatHistory, setAgentChatHistory] = useState<Record<string, { user: string; ai: string }[]>>({});
    const [agentTaskInput, setAgentTaskInput] = useState("");
    const [isAgentProcessing, setIsAgentProcessing] = useState(false);

    // --- File Explorer State (Conceptual) ---
    const [fileTree, setFileTree] = useState<any>(null); // Replace 'any' with a proper FileNode type
    const [activeFile, setActiveFile] = useState<string | null>(null); // Path of the active file

    // --- Version Control State (Conceptual) ---
    const [gitStatus, setGitStatus] = useState<string>("No repo initialized");
    const [commitMessage, setCommitMessage] = useState("");

    // --- Terminal State (Conceptual) ---
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [terminalInput, setTerminalInput] = useState("");


    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
        // Implement actual theme switching logic here (e.g., updating CSS classes on body)
        document.documentElement.classList.toggle('dark', theme === 'dark'); // Assuming dark is default
        toast({ title: `Theme switched to ${theme === 'light' ? 'Dark' : 'Light'}`, description: "Visual theme updated.", className: "font-mono" });
    }, [theme, toast]);


    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                setAppSettings({ ...defaultSettings, ...parsedSettings });
            } else {
                setAppSettings(defaultSettings);
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage:", error);
            setAppSettings(defaultSettings);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
            // Apply visual effects based on settings
            document.body.classList.toggle('scanlines-effect', appSettings.enableScanlines);
            document.body.classList.toggle('grain-effect', appSettings.enableGrain);
            // Glow is usually applied to specific elements, handle via CSS or component logic
        } catch (error) {
            console.error("Failed to save settings or apply effects:", error);
        }
    }, [appSettings]);

     const fetchAndSetOllamaModels = useCallback(async () => {
        if (!appSettings.ollamaBaseUrl) {
            console.warn("Ollama Base URL is not configured. Skipping Ollama model fetch.");
            setModelError("Ollama Base URL is not configured. Check Settings.");
            setOllamaModels([]); // Clear models if URL is missing
            return;
        }
        try {
            console.log("[page] Attempting to fetch Ollama models from:", appSettings.ollamaBaseUrl);
            const models = await listLocalOllamaModels(appSettings.ollamaBaseUrl);
            setOllamaModels(models);
            setModelError(null); // Clear previous errors
            console.log(`[page] Successfully fetched ${models.length} Ollama models.`);
            if (models.length === 0) {
                 toast({
                    variant: "default",
                    title: "Ollama: No Models Found",
                    description: "Connected to Ollama, but no local models listed. Pull models via 'ollama pull <model_name>'.",
                    className: "font-mono border-accent text-accent",
                });
            }
        } catch (error: any) {
            console.error('[page] Error fetching Ollama models:', error);
            setModelError(error.message || "Failed to connect or fetch Ollama models. Check console and Settings.");
            setOllamaModels([]);
            toast({
                variant: "destructive",
                title: "Ollama Connection Error",
                description: `Could not fetch models. ${error.message}`,
                className: "font-mono",
            });
        }
    }, [appSettings.ollamaBaseUrl, toast]);


    useEffect(() => {
        fetchAndSetOllamaModels();
    }, [fetchAndSetOllamaModels]); // fetchAndSetOllamaModels is now stable


    useEffect(() => {
        const combined: CombinedModel[] = [];
        ollamaModels.forEach(model => {
            combined.push({
                id: `ollama/${model.name}`,
                provider: 'Ollama',
                name: model.name,
            });
        });

        POTENTIAL_CLOUD_MODELS.forEach(m => {
             // Add cloud models based on API key presence AND plugin availability.
            if (m.provider === 'Google AI' && appSettings.googleApiKey) {
                 combined.push(m);
            } else if (m.provider === 'OpenRouter' && appSettings.openRouterApiKey && !m.unavailable) {
                 combined.push(m);
            } else if (m.provider === 'Hugging Face' && appSettings.huggingFaceApiKey && !m.unavailable) {
                combined.push(m);
            }
        });
        
        // Sort all models: Ollama first, then by provider, then by name
        combined.sort((a, b) => {
            if (a.provider === 'Ollama' && b.provider !== 'Ollama') return -1;
            if (a.provider !== 'Ollama' && b.provider === 'Ollama') return 1;
            if (a.provider < b.provider) return -1;
            if (a.provider > b.provider) return 1;
            return a.name.localeCompare(b.name);
        });

        setAllModels(combined);

        // Auto-select a model if current selection is invalid or list is empty
        if (combined.length > 0) {
            const currentSelectionValid = combined.some(m => m.id === selectedModelId);
            if (!currentSelectionValid || !selectedModelId) {
                // Prioritize Ollama if available and no critical error, else first Google AI, then first overall
                const firstOllama = combined.find(m => m.provider === 'Ollama');
                const firstGoogle = combined.find(m => m.provider === 'Google AI');
                
                if (firstOllama && (!modelError || (!modelError.includes("Failed to connect") && !modelError.includes("Ollama Base URL is not configured")))) {
                    setSelectedModelId(firstOllama.id);
                } else if (firstGoogle) {
                    setSelectedModelId(firstGoogle.id);
                } else {
                    setSelectedModelId(combined[0].id);
                }
            }
        } else {
            setSelectedModelId(''); // No models available
        }
        console.log(`[page] Combined model list updated. Total models: ${combined.length}. Selected: ${selectedModelId}`);

    }, [ollamaModels, appSettings.googleApiKey, appSettings.openRouterApiKey, appSettings.huggingFaceApiKey, selectedModelId, modelError]);


    const handleCodeGeneration = async (currentPrompt?: string) => {
        const promptToUse = typeof currentPrompt === 'string' ? currentPrompt : prompt;
        if (!promptToUse.trim()) {
            toast({ variant: "destructive", title: "Input Error", description: "Prompt cannot be empty.", className: "font-mono" });
            return;
        }
        setIsLoading(true);
        setCode(""); // Clear previous code, show loading state in CodeDisplay
        setPreviousCode(code); // Save current code before new generation
        setValidationStatus("VALIDATING_PROMPT...");

        try {
            if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected. Please choose one from settings or wait for list to load.");
            }
            setValidationStatus(`SENDING_TO_${selectedModelId.toUpperCase()}...`);
            const output = await generateCodeFromPrompt({
                prompt: promptToUse,
                previousCode: previousCode || undefined,
                modelName: selectedModelId,
            });

            // --- (Conceptual) Validation Pipeline ---
            setValidationStatus("VALIDATING_RESPONSE...");
            // const validationResult = await validateGeneratedCode(output.code, { language: 'typescript' }); // Example
            // if (!validationResult.success) {
            //    setCode(`// VALIDATION FAILED:\n// ${validationResult.errors.join('\n')}\n\n${output.code}`);
            //    setValidationStatus("ERR_VALIDATION_FAILED");
            //    toast({ variant: "destructive", title: "Validation Failed", description: "Generated code has issues. See output.", className: "font-mono" });
            //    return;
            // }
            // --- End Conceptual Validation ---

            setCode(output.code);
            // setPreviousCode(output.code); // Update previous code to the successfully generated one
            setValidationStatus("GENERATION_OK");
            console.log("[page] Code generation completed successfully.");
            toast({
                title: "SYS: AI Generation OK",
                description: `Code generated with ${selectedModelId}. Review and validate!`,
                className: "font-mono border-primary text-primary",
            });

        } catch (error: any) {
            console.error("[page] Code generation failed:", error);
            const errorMessage = error.message || "An unknown error occurred during generation.";
            setCode(`// AI_GENERATION_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// Error: ${errorMessage}\n// --- Previous Code Context (if any) ---\n${previousCode || '// No previous code context.'}`);
            setValidationStatus(`ERR_GENERATION_FAILED: ${errorMessage.substring(0,50)}...`);
            toast({
                variant: "destructive",
                title: "ERR: AI Generation Failed",
                description: errorMessage,
                className: "font-mono",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditSubmit = useCallback(async (newEditPrompt: string) => {
        if (!newEditPrompt.trim()) {
            toast({ variant: "destructive", title: "Input Error", description: "Edit instructions cannot be empty.", className: "font-mono" });
            return;
        }
        setIsLoading(true);
        setIsEditPopupOpen(false); // Close popup immediately
        // setCode("// Processing edit request..."); // Placeholder while loading
        setValidationStatus("EDIT_IN_PROGRESS...");

        try {
             if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected for editing. Please choose one.");
            }
            setValidationStatus(`SENDING_EDIT_TO_${selectedModelId.toUpperCase()}...`);
            const output = await generateCodeFromPrompt({
                prompt: newEditPrompt, // The edit instruction is the new prompt
                previousCode: code || undefined, // Current code is the context
                modelName: selectedModelId,
            });

            // --- (Conceptual) Validation Pipeline for Edits ---
            // const validationResult = await validateGeneratedCode(output.code, { language: 'typescript' });
            // if (!validationResult.success) { ... handle error ... }
            // --- End Conceptual Validation ---

            setCode(output.code);
            setPreviousCode(code); // Save the code *before* this successful edit
            setValidationStatus("EDIT_OK");
            toast({
                title: "SYS: AI Edit OK",
                description: `Code edited with ${selectedModelId}.`,
                className: "font-mono border-primary text-primary",
            });
        } catch (err: any) {
            const errorMessage = err.message || "An unknown error occurred during edit.";
            setCode(`// AI_EDIT_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// Error: ${errorMessage}\n// --- Original Code ---\n${code || '// No original code.'}`);
            setValidationStatus(`ERR_EDIT_FAILED: ${errorMessage.substring(0,50)}...`);
            toast({
                variant: "destructive",
                title: "ERR: AI Edit Failed",
                description: errorMessage,
                className: "font-mono",
            });
        } finally {
            setIsLoading(false);
        }
    }, [code, selectedModelId, toast]);


    // --- (Conceptual) Agent Interaction Handler ---
    const handleAgentTaskSubmit = async () => {
        if (!activeAgent || !agentTaskInput.trim()) {
            toast({ variant: "destructive", title: "Agent Error", description: "No agent selected or task is empty.", className: "font-mono" });
            return;
        }
        setIsAgentProcessing(true);
        setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_PROCESSING...`);
        // Simulate API call to agent flow
        try {
            // const response = await callAgentFlow(activeAgent.id, agentTaskInput, code);
            // Update agentChatHistory, potentially setCode if agent modifies it.
            // Example:
            // setAgentChatHistory(prev => ({
            //    ...prev,
            //    [activeAgent.id]: [...(prev[activeAgent.id] || []), { user: agentTaskInput, ai: response.text }]
            // }));
            // if (response.updatedCode) setCode(response.updatedCode);

            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            setAgentChatHistory(prev => ({
                ...prev,
                [activeAgent.id]: [...(prev[activeAgent.id] || []), { user: agentTaskInput, ai: `Processed task for ${activeAgent.name}: "${agentTaskInput}" (Simulated)` }]
            }));
            setAgentTaskInput(""); // Clear input
            setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_OK`);
            toast({ title: `${activeAgent.name} Task Processed`, description: "Agent completed the task (Simulated).", className: "font-mono" });
        } catch (error: any) {
            setValidationStatus(`ERR_AGENT_${activeAgent.id.toUpperCase()}_FAILED`);
            toast({ variant: "destructive", title: `${activeAgent.name} Error`, description: error.message, className: "font-mono" });
        } finally {
            setIsAgentProcessing(false);
        }
    };


    const getProviderIcon = (provider: string): React.ReactNode => {
        const baseClasses = "h-4 w-4 inline-block mr-2 align-middle"; // Ensure icon is inline and vertically aligned
        const commonUnavailableClasses = "opacity-50 group-hover:opacity-75"; // For unavailable icons

        const cloudModelMeta = POTENTIAL_CLOUD_MODELS.find(m => m.provider === provider);

        switch (provider) {
            case 'Ollama':
                return <HardDrive className={cn(baseClasses, "text-secondary", modelError && modelError.toLowerCase().includes("failed to connect") ? commonUnavailableClasses : "")} title={modelError && modelError.toLowerCase().includes("failed to connect") ? `Ollama (Connection Error)` : `Ollama (Local)`} />;
            case 'Google AI':
                return <BrainCircuit className={cn(baseClasses, "text-primary")} title="Google AI" />;
            case 'OpenRouter':
                return <CloudCog className={cn(baseClasses, "text-purple-400", cloudModelMeta?.unavailable ? commonUnavailableClasses : "")} title={cloudModelMeta?.unavailable ? "OpenRouter (Plugin Unavailable)" : "OpenRouter"} />;
            case 'Hugging Face':
                return <Binary className={cn(baseClasses, "text-yellow-400", cloudModelMeta?.unavailable ? commonUnavailableClasses : "")} title={cloudModelMeta?.unavailable ? "Hugging Face (Plugin Unavailable)" : "Hugging Face"} />;
            default:
                return <Code className={cn(baseClasses, "text-muted-foreground")} />;
        }
    };

    // Function to handle opening the edit popup
    const openEditPopup = () => {
        if (!code || code.startsWith('// AI_GENERATION_ERROR') || code.startsWith('// AI_EDIT_ERROR') || code === "") {
             toast({
                variant: "destructive",
                title: "Cannot Edit",
                description: "No valid code generated or current code is an error message. Generate code first.",
                className: "font-mono",
            });
            return;
        }
        setEditPrompt(""); // Clear previous edit prompt
        setIsEditPopupOpen(true);
    };


    // --- Conceptual: File Explorer Actions ---
    const handleFileSelect = (filePath: string) => {
        // Fetch file content, setActiveFile(filePath), setCode(content)
        console.log("File selected:", filePath);
        setActiveFile(filePath);
        setCode(`// Content of ${filePath} (Simulated)\nconsole.log('Hello from ${filePath}');`);
        toast({ title: "File Loaded", description: `${filePath} loaded into editor.`, className: "font-mono" });
    };
    const handleCreateFile = (fileName: string, inPath: string = "/") => {
        // AI call to generate boilerplate, then update fileTree
        console.log("Create file:", fileName, "in", inPath);
        // Simulate:
        const newFilePath = `${inPath}${fileName}`;
        // setFileTree(prev => updatedTree(prev, newFilePath, '// New file content'));
        handleFileSelect(newFilePath); // Open the new file
        toast({ title: "File Created", description: `AI generated ${fileName}.`, className: "font-mono" });
    };

    // --- Conceptual: Terminal Actions ---
    const handleTerminalCommand = (command: string) => {
        // Execute command (client-side simulation or server-side if real terminal)
        setTerminalOutput(prev => [...prev, `> ${command}`, `Simulated output for: ${command}`]);
        setTerminalInput("");
    };


    return (
        <SidebarProvider>
            {/* Main Sidebar */}
            <Sidebar className="w-64 group/sidebar" collapsible="icon">
                <SidebarHeader className="p-2 space-y-1">
                    <div className="font-bold text-lg text-primary chromatic-aberration-light" data-text="CodeSynth">
                        CodeSynth
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">// Retro AI IDE</p>
                    <SidebarTrigger className="md:hidden absolute top-2 right-2" />
                </SidebarHeader>

                <SidebarContent className="p-2 space-y-2">
                    {/* AI Agent Selector & Chat (Conceptual) */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="agents">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-2 rounded-none">
                                <BrainCircuit className="h-4 w-4 mr-2" /> AI Agents
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0">
                                <ScrollArea className="h-[150px] pr-2">
                                <div className="space-y-1">
                                    {AVAILABLE_AGENTS.map(agent => (
                                        <Button
                                            key={agent.id}
                                            variant={activeAgent?.id === agent.id ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs font-mono rounded-none"
                                            onClick={() => setActiveAgent(agent === activeAgent ? null : agent)}
                                        >
                                            <agent.icon className="h-3 w-3 mr-2"/> {agent.name}
                                        </Button>
                                    ))}
                                </div>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {activeAgent && (
                        <Card className="rounded-none bg-card/50 border-border/50 group-data-[collapsible=icon]:hidden">
                            <CardHeader className="p-2 border-b border-border/30">
                                <CardTitle className="text-sm font-mono flex items-center">
                                    <activeAgent.icon className="h-4 w-4 mr-2 text-accent"/>
                                    {activeAgent.name} Chat
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 text-xs max-h-[200px] overflow-y-auto">
                                <ScrollArea className="h-[150px] pr-2">
                                {(agentChatHistory[activeAgent.id] || []).map((entry, i) => (
                                    <div key={i} className="mb-1.5">
                                        <p><strong className="text-secondary">// User:</strong> {entry.user}</p>
                                        <p><strong className="text-primary">// {activeAgent.name}:</strong> {entry.ai}</p>
                                    </div>
                                ))}
                                {isAgentProcessing && <Loader2 className="h-3 w-3 animate-spin text-primary"/>}
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="p-2 border-t border-border/30">
                                <div className="w-full space-y-1">
                                <Textarea
                                    placeholder={`Task for ${activeAgent.name}...`}
                                    value={agentTaskInput}
                                    onChange={(e) => setAgentTaskInput(e.target.value)}
                                    rows={2}
                                    className="text-xs font-mono bg-input/70 rounded-none terminal-input"
                                    disabled={isAgentProcessing}
                                />
                                <Button size="sm" onClick={handleAgentTaskSubmit} disabled={isAgentProcessing || !agentTaskInput.trim()} className="w-full btn-neon-secondary text-xs rounded-none">
                                    {isAgentProcessing ? <Loader2 className="h-3 w-3 animate-spin"/> : "Send Task"}
                                </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )}


                     {/* File Explorer (Conceptual) */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="files">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-2 rounded-none">
                                <ListTree className="h-4 w-4 mr-2" /> File System
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0">
                                <ScrollArea className="h-[150px] pr-2">
                                <div className="text-xs font-mono space-y-0.5">
                                    {/* Placeholder for file tree rendering. Real implementation would use recursion or a library. */}
                                    <div onClick={() => handleFileSelect("src/app/page.tsx")} className="cursor-pointer p-1 hover:bg-accent/10 rounded-none">{'>'} src/app/page.tsx</div>
                                    <div onClick={() => handleFileSelect("src/components/ui/button.tsx")} className="cursor-pointer p-1 hover:bg-accent/10 rounded-none">{'>'} src/components/ui/button.tsx</div>
                                    <div onClick={() => handleFileSelect("README.md")} className="cursor-pointer p-1 hover:bg-accent/10 rounded-none">{'>'} README.md</div>
                                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-1 rounded-none" onClick={() => handleCreateFile(prompt("Enter new file name (e.g., utils.ts):") || "new-file.ts")}>+ Create File (AI)</Button>
                                </div>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>


                    {/* Version Control (Conceptual) */}
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="vcs">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-2 rounded-none">
                                <GitBranch className="h-4 w-4 mr-2" /> Version Control
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0 text-xs font-mono space-y-1">
                                <p>Status: <span className="text-secondary">{gitStatus}</span></p>
                                <Input placeholder="Commit message..." value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="text-xs rounded-none bg-input/70 terminal-input"/>
                                <Button size="sm" className="w-full btn-neon-secondary text-xs rounded-none" onClick={() => { setGitStatus("Committed (Simulated)"); toast({title: "Commit (Simulated)", description: commitMessage}); setCommitMessage(""); }}>Commit</Button>
                                <Button variant="ghost" size="sm" className="w-full text-xs rounded-none">View History (N/A)</Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Separator className="my-2 border-border/30 group-data-[collapsible=icon]:hidden"/>

                    <div className="group-data-[collapsible=icon]:hidden text-xs font-mono text-muted-foreground p-2">
                        <p>// Main Navigation</p>
                    </div>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Dashboard" isActive={true}>
                                <LayoutDashboard /> <span>Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Firebase/Cloud">
                                <Cloud /> <span>Deployments</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton tooltip="User Authentication">
                                <Users/> <span>Auth Manager</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter className="p-2 border-t border-border/30">
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowSettingsPanel(true)} ref={settingsButtonRef} className="w-full btn-neon text-xs rounded-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-8">
                            <Settings className="mr-0 md:mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                        </Button>
                         <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full btn-neon-secondary text-xs rounded-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-8">
                            <Palette className="mr-0 md:mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                             <span className="group-data-[collapsible=icon]:hidden">Toggle Theme</span>
                        </Button>
                    </div>
                </SidebarFooter>
                 <SidebarRail />
            </Sidebar>


            <SidebarInset className="flex flex-col"> {/* Ensure SidebarInset uses flex-col */}
                <header className="p-3 border-b-2 border-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center">
                        <Label htmlFor="model-select" className="text-sm font-mono mr-2 whitespace-nowrap">// AI_Model:</Label>
                        <Select
                            value={selectedModelId}
                            onValueChange={setSelectedModelId}
                        >
                            <SelectTrigger id="model-select" className="bg-input border-border rounded-none text-xs font-mono min-w-[180px] max-w-[250px] h-8">
                                <SelectValue placeholder="Select Model..." />
                            </SelectTrigger>
                            <SelectContent className="font-mono text-xs rounded-none max-h-[300px]">
                                <SelectGroup>
                                    <SelectLabel className="font-mono text-xs">Available Models</SelectLabel>
                                    {allModels.length > 0 ? allModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id} className="py-1 px-2 hover:bg-accent/20">
                                            <div className="flex items-center">
                                                {getProviderIcon(model.provider)}
                                                <span>{model.name}</span>
                                                {POTENTIAL_CLOUD_MODELS.find(pm => pm.id === model.id)?.unavailable && <Badge variant="destructive" className="ml-auto text-[0.6rem] px-1 py-0">Unavailable</Badge>}
                                            </div>
                                        </SelectItem>
                                    )) : (
                                         <SelectItem value="no-models" disabled className="py-1 px-2">
                                            No models available or loading...
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={fetchAndSetOllamaModels} className="ml-1 hover:bg-accent/10 w-7 h-7 p-1 rounded-none border border-transparent hover:border-accent neon-glow">
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="font-mono text-xs">
                                    Refresh Model List (Force update Ollama)
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="hidden md:block"> {/* Hide on small screens, show on medium and up */}
                        <SidebarTrigger />
                    </div>
                </header>

                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-2 md:p-3 gap-2 md:gap-3">
                    <div className="lg:w-1/3 flex flex-col gap-3 h-full"> {/* Ensure this takes full height */}
                        <PromptInput
                            prompt={prompt}
                            setPrompt={setPrompt}
                            onSubmit={() => handleCodeGeneration()}
                            isLoading={isLoading}
                            placeholderText="// System Prompt: Describe application, files, features..."
                        />
                    </div>

                    <div className="hidden lg:block mx-1 border-l-2 border-border flex-shrink-0"></div>
                    <div className="lg:hidden my-1 border-b-2 border-border flex-shrink-0"></div>

                    <div className="lg:w-2/3 flex-grow flex flex-col overflow-hidden h-full"> {/* Ensure this takes full height */}
                        <CodeDisplay
                            code={code}
                            title={activeFile ? `// ${activeFile} //` : "// Generated_Code_Buffer //"}
                            language={activeFile?.split('.').pop() || "typescript"} // Infer language
                            isLoading={isLoading}
                            containerClassName="flex-grow" // Make CodeDisplay fill available space
                        />
                        <div className="mt-2 flex justify-end flex-shrink-0">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={openEditPopup}
                                disabled={isLoading || !code || code.startsWith('// AI_GENERATION_ERROR') || code.startsWith('// AI_EDIT_ERROR') || code === ""}
                                className="rounded-none btn-neon-secondary text-xs"
                            >
                                Edit with Prompt
                            </Button>
                        </div>
                    </div>
                </main>

                {isEditPopupOpen && (
                    <EditPopup
                        initialCode={code || ""}
                        onSubmit={handleEditSubmit}
                        onClose={() => setIsEditPopupOpen(false)}
                        isLoading={isLoading}
                        selectedModelId={selectedModelId}
                    />
                )}

                {showSettingsPanel && (
                    <SettingsPanel onClose={() => { setShowSettingsPanel(false); fetchAndSetOllamaModels(); }} />
                )}

                {/* Conceptual Terminal Pane - could be a drawer or another section */}
                <Accordion type="single" collapsible className="w-full flex-shrink-0 border-t-2 border-border">
                    <AccordionItem value="terminal">
                        <AccordionTrigger className="text-sm font-mono hover:no-underline p-2 rounded-none bg-card/30 hover:bg-card/50">
                            <Terminal className="h-4 w-4 mr-2"/> // System_Terminal //
                        </AccordionTrigger>
                        <AccordionContent className="p-2 bg-black text-xs font-mono text-green-400 max-h-[150px] overflow-y-auto">
                            <ScrollArea className="h-[120px] pr-2">
                            {terminalOutput.map((line, i) => <div key={i} dangerouslySetInnerHTML={{ __html: line.replace(/</g, "&lt;").replace(/>/g, "&gt;") }}></div>)}
                            </ScrollArea>
                            <div className="flex mt-1">
                                <span className="text-green-400 mr-1 font-bold">&gt;</span>
                                <Input
                                    type="text"
                                    value={terminalInput}
                                    onChange={(e) => setTerminalInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleTerminalCommand(terminalInput); }}
                                    className="bg-transparent border-none text-green-400 focus:ring-0 p-0 h-auto text-xs flex-grow terminal-input"
                                    placeholder="Enter command..."
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>


                {/* Footer */}
                <footer className="pt-1 mt-auto border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
                 [ CodeSynth IDE v0.7 | Active Providers: {getProviderNames(allModels, modelError, appSettings, POTENTIAL_CLOUD_MODELS)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
                </footer>
             </SidebarInset>
        </SidebarProvider>
    );
}

