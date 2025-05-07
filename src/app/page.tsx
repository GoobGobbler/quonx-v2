
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrainCircuit, Code, Construction, FileCode2, GitBranch, HardDrive, LayoutDashboard,
  LayoutPanelLeft, ListChecks, LucideIcon, Palette, Rocket, Settings, Terminal, Users,
  CloudCog, Binary, RefreshCcw, ListTree, Cloud, TestTube2, ShieldCheck, Files, BotMessageSquare, Workflow, Microscope, Zap // Added icons for new agents/features
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getProviderNames } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeDisplay, type DisplayableFile } from "@/components/code-display"; // Updated import for DisplayableFile
import { PromptInput } from "@/components/prompt-input";
import { EditPopup } from "@/components/edit-popup";
import { AppSettings, defaultSettings, SETTINGS_STORAGE_KEY } from '@/components/settings-panel';
import { SettingsPanel } from '@/components/settings-panel';
import { useToast } from "@/hooks/use-toast";
import { listLocalOllamaModels, type OllamaModel as ClientOllamaModel } from '@/lib/ollama-client'; // Use type ClientOllamaModel
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { generateCodeFromPrompt, type FileObject } from '@/ai/flows/generate-code-from-prompt'; // Import FileObject type
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from 'lucide-react';


type ModelMetadata = {
    id: string;
    provider: string;
    name: string;
    unavailable?: boolean;
};
type CombinedModel = {
    id: string;
    provider: string;
    name: string;
    unavailable?: boolean;
};

const POTENTIAL_CLOUD_MODELS: ModelMetadata[] = [
    { id: 'googleai/gemini-1.5-flash-latest', provider: 'Google AI', name: 'Gemini 1.5 Flash (Cloud)' },
    { id: 'googleai/gemini-1.5-pro-latest', provider: 'Google AI', name: 'Gemini 1.5 Pro (Cloud)' },
    { id: 'openrouter/anthropic/claude-3-haiku', provider: 'OpenRouter', name: 'Claude 3 Haiku (OpenRouter)', unavailable: true }, // Marked unavailable due to package issue
    { id: 'huggingface/codellama/CodeLlama-7b-hf', provider: 'Hugging Face', name: 'CodeLlama-7b-hf (HF)', unavailable: true }, // Marked unavailable due to package issue
];

interface Agent {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    capabilities: string[];
    placeholderTask?: string; // Placeholder for agent-specific task input
}

const AVAILABLE_AGENTS: Agent[] = [
    {
        id: 'code-assistant',
        name: 'Code Assistant',
        description: 'Handles snippet generation, inline refactoring, documentation, lint fixes, and unit test generation.',
        icon: BotMessageSquare,
        capabilities: ['code_generation', 'refactoring', 'documentation', 'lint_fix', 'test_generation'],
        placeholderTask: 'e.g., "refactor this function", "add docs to class X", "generate unit tests for Y.ts"'
    },
    {
        id: 'project-architect',
        name: 'Project Architect',
        description: 'Plans and scaffolds modules, CI/CD pipelines, infrastructure-as-code, and large-scale refactors.',
        icon: Workflow,
        capabilities: ['module_scaffolding', 'cicd_planning', 'iac_generation', 'refactor_large_scale', 'plugin_wiring'],
        placeholderTask: 'e.g., "scaffold a Next.js app with Firebase auth", "plan CI/CD for this project"'
    },
    {
        id: 'security-analyst',
        name: 'Security Analyst',
        description: 'Scans code for vulnerabilities, suggests secure coding practices, and reviews dependencies. (Conceptual)',
        icon: ShieldCheck,
        capabilities: ['vulnerability_scanning', 'secure_code_review', 'dependency_check', 'compliance_check'],
        placeholderTask: 'e.g., "scan active file for vulnerabilities", "review dependencies for issues"'
    },
    {
        id: 'firebase-expert',
        name: 'Firebase Expert',
        description: 'Helps scaffold Firebase features (Auth, Firestore, Functions), configure rules, and set up deployments. (Conceptual)',
        icon: Zap, // Using Zap as a more "electric" Firebase icon
        capabilities: ['firestore_schema_generation', 'firebase_auth_setup', 'functions_scaffolding', 'hosting_config', 'storage_rules'],
        placeholderTask: 'e.g., "scaffold Firestore rules for users collection", "setup Firebase Auth with email/password"'
    },
    {
        id: 'ml-ops-integrator',
        name: 'MLOps Integrator',
        description: 'Integrates MLOps pipelines, tracks experiments, and manages model versions. (Conceptual)',
        icon: Microscope,
        capabilities: ['experiment_tracking_setup', 'model_versioning_config', 'observability_dashboard_setup'],
        placeholderTask: 'e.g., "setup experiment tracking for this flow", "configure model versioning"'
    }
];

// Placeholder for a more structured file tree node
interface FileTreeNode {
    path: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileTreeNode[];
    content?: string; // For files
}


export default function Home() {
    const [prompt, setPrompt] = useState<string>("// System Prompt: Describe the full-stack application, desired file structure, specific features, components, languages (e.g., Next.js, Firebase), and any plugins or assets needed...");
    const [generatedFiles, setGeneratedFiles] = useState<FileObject[] | null>(null); // Store array of generated files
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditPopupOpen, setIsEditPopupOpen] = useState<boolean>(false);
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [allModels, setAllModels] = useState<CombinedModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>(''); // Default to empty, will be set by effect
    const [previousFileContent, setPreviousFileContent] = useState<string | null>(null); // For editing context
    const [ollamaModels, setOllamaModels] = useState<ClientOllamaModel[]>([]);
    const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
    const { toast } = useToast();
    const [modelError, setModelError] = useState<string | null>(null); 
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);

    const [validationStatus, setValidationStatus] = useState<string>("Awaiting Command..."); // Updated initial status
    const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark

    const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
    const [agentChatHistory, setAgentChatHistory] = useState<Record<string, { user: string; ai: string; timestamp: string }[]>>({});
    const [agentTaskInput, setAgentTaskInput] = useState("");
    const [isAgentProcessing, setIsAgentProcessing] = useState(false);

    const [fileTree, setFileTree] = useState<FileTreeNode | null>(null); // Placeholder for generated file tree
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null); // Path of the active file being displayed/edited

    const [gitStatus, setGitStatus] = useState<string>("No repo initialized (Simulated)");
    const [commitMessage, setCommitMessage] = useState("");

    const [terminalOutput, setTerminalOutput] = useState<string[]>(['// CodeSynth Terminal v0.8 Initialized...']);
    const [terminalInput, setTerminalInput] = useState("");

    // --- Refs for animations (conceptual) ---
    const rotaryKnobRef = useRef<HTMLDivElement>(null);
    const tapeSliderRef = useRef<HTMLDivElement>(null);

    // --- Conceptual animation logic ---
    useEffect(() => {
        // Placeholder for rotary knob animation on hover/drag
        const knob = rotaryKnobRef.current;
        if (knob) {
            // knob.addEventListener('mousemove', (e) => { /* rotate based on mouse */ });
        }
        // Placeholder for tape slider animation
    }, []);


    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        toast({ title: `Theme Switched: ${newTheme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}`, description: "// Visual matrix reconfigured.", className: "font-mono" });
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
            document.documentElement.classList.toggle('dark', theme === 'dark'); // Ensure theme class is also set
            document.body.classList.toggle('scanlines-effect', appSettings.enableScanlines);
            document.body.classList.toggle('grain-effect', appSettings.enableGrain);
            // Glow is applied via specific classes like .neon-glow, not globally on body
        } catch (error) {
            console.error("Failed to save settings or apply effects:", error);
        }
    }, [appSettings, theme]); // Added theme dependency

     const fetchAndSetOllamaModels = useCallback(async () => {
        if (!appSettings.ollamaBaseUrl) {
            console.warn("Ollama Base URL is not configured. Skipping Ollama model fetch.");
            setModelError("ERR: Ollama Base URL not configured. Check Settings.");
            setOllamaModels([]);
            return;
        }
        setModelError(null); // Clear previous errors before fetching
        try {
            console.log("[page] Attempting to fetch Ollama models from:", appSettings.ollamaBaseUrl);
            setValidationStatus("Connecting to Ollama...");
            const models = await listLocalOllamaModels(appSettings.ollamaBaseUrl);
            setOllamaModels(models);
            console.log(`[page] Successfully fetched ${models.length} Ollama models.`);
            if (models.length === 0) {
                 toast({
                    variant: "default",
                    title: "SYS: Ollama Connection OK",
                    description: "No local models found. Use 'ollama pull <model_name>' to download models.",
                    className: "font-mono border-accent text-accent",
                });
                setValidationStatus("Ollama OK (No Models)");
            } else {
                setValidationStatus("Ollama Models Loaded");
            }
        } catch (error: any) {
            console.error('[page] Error fetching Ollama models:', error);
            const specificMessage = error.message || "Failed to connect or fetch Ollama models. Check console and Settings.";
            setModelError(`ERR_OLLAMA: ${specificMessage}`);
            setValidationStatus(`ERR_OLLAMA_FETCH: ${specificMessage.substring(0,30)}...`);
            setOllamaModels([]); // Clear models on error
            toast({
                variant: "destructive",
                title: "ERR: Ollama Connection Failed",
                description: specificMessage,
                className: "font-mono",
            });
        }
    }, [appSettings.ollamaBaseUrl, toast]);


    useEffect(() => {
        fetchAndSetOllamaModels();
    }, [fetchAndSetOllamaModels]);


    useEffect(() => {
        const combined: CombinedModel[] = [];
        ollamaModels.forEach(model => {
            combined.push({
                id: `ollama/${model.name}`, // Ensure 'ollama/' prefix
                provider: 'Ollama',
                name: model.name.replace(':latest', ''), // Clean up name
            });
        });

        POTENTIAL_CLOUD_MODELS.forEach(m => {
            let canAdd = false;
            if (m.provider === 'Google AI' && appSettings.googleApiKey) canAdd = true;
            else if (m.provider === 'OpenRouter' && appSettings.openRouterApiKey && !m.unavailable) canAdd = true;
            else if (m.provider === 'Hugging Face' && appSettings.huggingFaceApiKey && !m.unavailable) canAdd = true;
            
            if (canAdd) {
                 combined.push({ id: m.id, provider: m.provider, name: m.name, unavailable: m.unavailable });
            }
        });
        
        combined.sort((a, b) => {
            if (a.provider === 'Ollama' && b.provider !== 'Ollama') return -1;
            if (a.provider !== 'Ollama' && b.provider === 'Ollama') return 1;
            if (a.provider < b.provider) return -1;
            if (a.provider > b.provider) return 1;
            return a.name.localeCompare(b.name);
        });

        setAllModels(combined);

        if (combined.length > 0) {
            const currentSelectionValid = combined.some(m => m.id === selectedModelId && !m.unavailable);
            if (!currentSelectionValid || !selectedModelId) {
                // Prioritize Ollama if base URL is set and no critical connection error
                const ollamaConnectError = modelError && (modelError.toLowerCase().includes("failed to connect") || modelError.toLowerCase().includes("connection refused") || modelError.includes("Ollama Base URL is not configured"));
                const firstOllama = combined.find(m => m.provider === 'Ollama' && !m.unavailable);
                const firstGoogle = combined.find(m => m.provider === 'Google AI' && !m.unavailable);
                
                if (appSettings.ollamaBaseUrl && firstOllama && !ollamaConnectError) {
                    setSelectedModelId(firstOllama.id);
                } else if (firstGoogle) {
                    setSelectedModelId(firstGoogle.id);
                } else {
                    const firstAvailableNonUnavailable = combined.find(m => !m.unavailable);
                    setSelectedModelId(firstAvailableNonUnavailable ? firstAvailableNonUnavailable.id : (combined[0]?.id || ''));
                }
            }
        } else {
            setSelectedModelId('');
            if (!modelError) setValidationStatus("No Models Found/Configured");
        }
        console.log(`[page] Combined model list updated. Total models: ${combined.length}. Selected: ${selectedModelId}`);

    }, [ollamaModels, appSettings, selectedModelId, modelError]); // Simplified dependencies

    const handleCodeGeneration = async (currentPrompt?: string, agentContext?: Agent) => {
        const promptToUse = typeof currentPrompt === 'string' ? currentPrompt : prompt;
        if (!promptToUse.trim()) {
            toast({ variant: "destructive", title: "Input Error", description: "Prompt cannot be empty.", className: "font-mono" });
            return;
        }
        setIsLoading(true);
        setGeneratedFiles(null); 
        setFileTree(null); // Clear file tree as well
        setActiveFilePath(null);
        setValidationStatus("VALIDATING_PROMPT...");

        // Prepend agent context if an agent is active and making the request
        let finalPrompt = promptToUse;
        if (agentContext) {
            finalPrompt = `// Agent: ${agentContext.name} // Task: ${promptToUse}\n\n${promptToUse}`;
        }


        try {
            if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected. Please choose one from the dropdown or configure in Settings.");
            }
            setValidationStatus(`SENDING_TO_${selectedModelId.toUpperCase()}...`);
            // TODO: For multimodal input, this is where image/sketch data would be processed and added to the prompt/input
            // Example: const processedPrompt = await processMultimodalInput({ text: finalPrompt, imageDataUri: sketchData });
            const output = await generateCodeFromPrompt({
                prompt: finalPrompt,
                previousCode: previousFileContent || undefined, // Only relevant if activeFilePath is set and editing that specific file context
                modelName: selectedModelId,
            });

            setGeneratedFiles(output.files);
            if (output.files.length > 0) {
                const tree = buildFileTree(output.files);
                setFileTree(tree);
                // Set first file as active, unless an agent task implies a specific target
                const firstFile = output.files[0];
                setActiveFilePath(firstFile.filePath); 
                setPreviousFileContent(firstFile.content); 
                toast({
                    title: "SYS: AI Generation OK",
                    description: `${output.files.length} file(s) generated via ${selectedModelId}. Active: ${firstFile.filePath}. Review and validate.`,
                    className: "font-mono border-primary text-primary",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "SYS: AI Generation Empty",
                    description: `Model ${selectedModelId} returned no files. Try a more specific prompt or different model.`,
                    className: "font-mono",
                });
            }
            // TODO: Trigger validation pipeline here
            // const validationResult = await validateGeneratedCode(output.files);
            // if (!validationResult.success) { setValidationStatus(`VALIDATION_FAILED: ${validationResult.message}`); }
            // else { setValidationStatus("GENERATION_OK_VALIDATED"); }
            setValidationStatus("GENERATION_OK");
            console.log("[page] Code generation completed. Files:", output.files.map(f => f.filePath));


        } catch (error: any) {
            console.error("[page] Code generation failed:", error);
            const errorMessage = error.message || "An unknown error occurred during generation.";
            const errorFileContent = `// AI_GENERATION_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// Prompt: ${finalPrompt.substring(0, 200)}...\n// Error: ${errorMessage}\n// --- Previous Code Context (if any) ---\n${previousFileContent || '// No previous code context.'}`;
            setGeneratedFiles([{ filePath: "GENERATION_ERROR.log", content: errorFileContent }]);
            setActiveFilePath("GENERATION_ERROR.log");
            setFileTree(null);
            setValidationStatus(`ERR_GENERATION: ${errorMessage.substring(0,50)}...`);
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
        setIsEditPopupOpen(false);
        setValidationStatus("EDIT_IN_PROGRESS...");

        const currentContentToEdit = generatedFiles?.find(f => f.filePath === activeFilePath)?.content || previousFileContent;
        const editFileContext = activeFilePath || "the current code snippet";

        const fullEditPrompt = `// Editing File: ${editFileContext} //\n// Instructions: ${newEditPrompt}\n\n---\n\n${newEditPrompt}`;


        try {
             if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected for editing. Please choose one.");
            }
            setValidationStatus(`SENDING_EDIT_TO_${selectedModelId.toUpperCase()}...`);
            const output = await generateCodeFromPrompt({
                prompt: fullEditPrompt, 
                previousCode: currentContentToEdit || undefined, 
                modelName: selectedModelId,
            });

            if (output.files && output.files.length > 0) {
                setGeneratedFiles(prevFiles => {
                    const newFilesMap = new Map((prevFiles || []).map(f => [f.filePath, f]));
                    output.files.forEach(newFile => {
                        newFilesMap.set(newFile.filePath, newFile); // Add or update file
                    });
                    const updatedFiles = Array.from(newFilesMap.values());
                    setFileTree(buildFileTree(updatedFiles)); 
                    return updatedFiles;
                });
                
                // If the edited file is among the output, keep it active, otherwise, set first output file active
                const editedFileInOutput = output.files.find(f => f.filePath === activeFilePath);
                const newActiveFile = editedFileInOutput || output.files[0];

                setActiveFilePath(newActiveFile.filePath); 
                setPreviousFileContent(newActiveFile.content);
            }
            // TODO: Trigger validation pipeline here
            setValidationStatus("EDIT_OK");
            toast({
                title: "SYS: AI Edit OK",
                description: `Code for ${activeFilePath || "selection"} edited with ${selectedModelId}.`,
                className: "font-mono border-primary text-primary",
            });
        } catch (err: any) {
            const errorMessage = err.message || "An unknown error occurred during edit.";
            const errorFileContent = `// AI_EDIT_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// File: ${activeFilePath}\n// Error: ${errorMessage}\n// --- Original Code ---\n${currentContentToEdit || '// No original code.'}`;
            setGeneratedFiles(prev => [...(prev || []).filter(f => f.filePath !== "EDIT_ERROR.log"), { filePath: "EDIT_ERROR.log", content: errorFileContent }]);
            setActiveFilePath("EDIT_ERROR.log");
            // Don't nullify file tree on edit error, just show error file
            setValidationStatus(`ERR_EDIT: ${errorMessage.substring(0,50)}...`);
            toast({
                variant: "destructive",
                title: "ERR: AI Edit Failed",
                description: errorMessage,
                className: "font-mono",
            });
        } finally {
            setIsLoading(false);
        }
    }, [generatedFiles, activeFilePath, selectedModelId, toast, previousFileContent]);


    const handleAgentTaskSubmit = async () => {
        if (!activeAgent || !agentTaskInput.trim()) {
            toast({ variant: "destructive", title: "Agent Error", description: "No agent selected or task input is empty.", className: "font-mono" });
            return;
        }
        setIsAgentProcessing(true);
        setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_BUSY...`);
        const currentTimestamp = new Date().toLocaleTimeString();
        
        setAgentChatHistory(prev => ({
            ...prev,
            [activeAgent.id]: [...(prev[activeAgent.id] || []), { user: agentTaskInput, ai: "Processing...", timestamp: currentTimestamp }]
        }));

        // Simulate agent processing and route to main generator or specific flow
        let taskResultDescription = `Task routed to ${activeAgent.name}: "${agentTaskInput}"`;
        let aiResponseForChat = `Simulated AI response for ${activeAgent.name} processing: "${agentTaskInput}"`;

        // --- Actual Agent Logic Routing ---
        if (activeAgent.id === 'code-assistant' && agentTaskInput.toLowerCase().includes('unit test')) {
            const currentCode = generatedFiles?.find(f => f.filePath === activeFilePath)?.content;
            if (currentCode) {
                const testPrompt = `Generate comprehensive unit tests for the following ${activeFilePath?.split('.').pop() || 'code'} located at "${activeFilePath}". Adhere to best practices for testing in the detected language/framework.\n\nCode:\n\`\`\`\n${currentCode}\n\`\`\`\n\nSpecific Instructions: ${agentTaskInput}`;
                // Update main prompt and trigger generation
                setPrompt(testPrompt); 
                await handleCodeGeneration(testPrompt, activeAgent); // Pass agent context
                aiResponseForChat = `Code Assistant is generating unit tests for ${activeFilePath} based on your input. Check the main code display.`;
            } else {
                aiResponseForChat = "Code Assistant: No active code file selected to generate tests for. Please select a file.";
            }
        } else if (activeAgent.id === 'project-architect' && agentTaskInput.toLowerCase().includes('scaffold')) {
            setPrompt(agentTaskInput); 
            await handleCodeGeneration(agentTaskInput, activeAgent);
            aiResponseForChat = `Project Architect is scaffolding based on: "${agentTaskInput}". Check the main code display and file explorer.`;
        } else if (activeAgent.id === 'security-analyst') {
            // TODO: Implement actual security scanning logic (e.g., calling a tool via Genkit)
            aiResponseForChat = `Security Analyst (Simulated): Scanned ${activeFilePath || "project"} for vulnerabilities. Found 0 critical issues. (Actual scanning not yet implemented).`;
        } else if (activeAgent.id === 'firebase-expert') {
             // Example: If task is "setup firebase auth", construct a detailed prompt
            if (agentTaskInput.toLowerCase().includes("firebase auth")) {
                const firebaseAuthPrompt = `Scaffold Firebase Authentication for a Next.js application. Include:
                1. Firebase configuration file (e.g., firebase.config.js or .ts).
                2. An Auth context provider (e.g., AuthContext.tsx).
                3. Example login, signup, and logout functions using Firebase SDK.
                4. A simple UI component for login/signup forms.
                Ensure all necessary Firebase SDK imports are included. Specify file paths clearly.`;
                setPrompt(firebaseAuthPrompt);
                await handleCodeGeneration(firebaseAuthPrompt, activeAgent);
                aiResponseForChat = `Firebase Expert is scaffolding Firebase Auth. Check main code display and file explorer.`;
            } else {
                aiResponseForChat = `Firebase Expert (Simulated): Processed task "${agentTaskInput}". (Full Firebase scaffolding not yet implemented for this specific request).`;
            }
        } else if (activeAgent.id === 'ml-ops-integrator') {
            aiResponseForChat = `MLOps Integrator (Simulated): Processed task "${agentTaskInput}". (MLOps integration features are conceptual).`;
        }
        // --- End Actual Agent Logic Routing ---

        // Update chat history with actual AI response
        setAgentChatHistory(prev => {
            const history = prev[activeAgent.id] || [];
            const lastEntryIndex = history.length -1;
            if (lastEntryIndex >=0 && history[lastEntryIndex].ai === "Processing...") {
                history[lastEntryIndex].ai = aiResponseForChat;
            } else { // Should not happen if logic is correct
                 history.push({ user: agentTaskInput, ai: aiResponseForChat, timestamp: currentTimestamp });
            }
            return { ...prev, [activeAgent.id]: history };
        });

        setAgentTaskInput(""); // Clear input after submission
        setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_OK`);
        toast({ title: `${activeAgent.name} Task Update`, description: taskResultDescription, className: "font-mono" });
        setIsAgentProcessing(false);
    };


    const getProviderIcon = (provider: string): React.ReactNode => {
        const baseClasses = "h-3.5 w-3.5 inline-block mr-1.5 align-middle"; // Slightly smaller icons
        const commonUnavailableClasses = "opacity-40 group-hover:opacity-60 grayscale";

        const cloudModelMeta = POTENTIAL_CLOUD_MODELS.find(m => m.provider === provider);
        const isUnavailable = cloudModelMeta?.unavailable;

        switch (provider) {
            case 'Ollama':
                const ollamaConnectionError = modelError && (modelError.toLowerCase().includes("failed to connect") || modelError.toLowerCase().includes("connection refused") || modelError.includes("ollama base url is not configured"));
                return <HardDrive className={cn(baseClasses, "text-secondary", ollamaConnectionError ? commonUnavailableClasses : "")} title={ollamaConnectionError ? `Ollama (Connection Error)` : `Ollama (Local)`} />;
            case 'Google AI':
                return <BrainCircuit className={cn(baseClasses, "text-primary", !appSettings.googleApiKey ? commonUnavailableClasses : "")} title={!appSettings.googleApiKey ? "Google AI (API Key Missing)" : "Google AI"} />;
            case 'OpenRouter':
                return <CloudCog className={cn(baseClasses, "text-purple-400", isUnavailable || !appSettings.openRouterApiKey ? commonUnavailableClasses : "")} title={isUnavailable ? "OpenRouter (Plugin Unavailable)" : (!appSettings.openRouterApiKey ? "OpenRouter (API Key Missing)" : "OpenRouter")} />;
            case 'Hugging Face':
                return <Binary className={cn(baseClasses, "text-yellow-400", isUnavailable || !appSettings.huggingFaceApiKey ? commonUnavailableClasses : "")} title={isUnavailable ? "Hugging Face (Plugin Unavailable)" : (!appSettings.huggingFaceApiKey ? "Hugging Face (API Key Missing)" : "Hugging Face")} />;
            default:
                return <Code className={cn(baseClasses, "text-muted-foreground")} />;
        }
    };

    const openEditPopup = () => {
        const currentFile = generatedFiles?.find(f => f.filePath === activeFilePath);
        if (!currentFile || currentFile.filePath.includes("ERROR.log") || currentFile.filePath.includes("GENERATION_ERROR.log")) {
             toast({
                variant: "destructive",
                title: "Cannot Edit",
                description: "No valid file selected or current file is an error message. Generate or select a file first.",
                className: "font-mono",
            });
            return;
        }
        setEditPrompt(`// Instructions to modify ${currentFile.filePath}:\n`); // Pre-fill with context
        setIsEditPopupOpen(true);
    };

    const handleFileSelect = (filePath: string) => {
        setActiveFilePath(filePath);
        const selectedFile = generatedFiles?.find(f => f.filePath === filePath);
        setPreviousFileContent(selectedFile?.content || null); 
        toast({ title: "File Active", description: `// Switched to: ${filePath}`, className: "font-mono" });
    };

    const handleCreateFileOrFolder = async (type: 'file' | 'folder') => {
        const name = window.prompt(`Enter name for new ${type} (e.g., "src/components/NewButton.tsx" or "src/utils"):`);
        if (!name || !name.trim()) {
            toast({variant: "destructive", title: "Input Canceled", description: "No name provided for new item.", className: "font-mono"});
            return;
        }

        const creationPrompt = type === 'file'
            ? `Create a new empty file at the path "${name}". If it's a common file type (e.g., .js, .ts, .css, .md, .html), provide minimal, valid boilerplate content. For example, for a .tsx file, a simple React component. For a .json, an empty object {}. For .md, a title.`
            : `Create a new folder structure for the path "${name}". If the path implies nested folders, create them. If this is a common project folder name (e.g., 'components', 'utils', 'routes', 'models', 'public', 'styles'), you can optionally suggest a common placeholder file within the deepest new folder, like an 'index.js' or a '.gitkeep' or a 'README.md' with basic content. The primary goal is folder creation.`;

        setIsLoading(true);
        setValidationStatus(`CREATING_${type.toUpperCase()}...`);
        try {
            if (!selectedModelId) throw new Error("No AI model selected for creation task.");
            const output = await generateCodeFromPrompt({
                prompt: creationPrompt,
                modelName: selectedModelId,
            });

            if (output.files.length > 0) {
                setGeneratedFiles(prevFiles => {
                    const newFilesMap = new Map((prevFiles || []).map(f => [f.filePath, f]));
                    output.files.forEach(newFile => newFilesMap.set(newFile.filePath, newFile)); // Add or update
                    return Array.from(newFilesMap.values());
                });
                // If a file was created, set it active. If a folder, it might just create structure.
                const newActiveFile = output.files.find(f => f.filePath === name && type === 'file') || output.files[0];
                if (newActiveFile) {
                     setActiveFilePath(newActiveFile.filePath);
                     setPreviousFileContent(newActiveFile.content);
                }
                setFileTree(buildFileTree(generatedFiles || [])); // Rebuild tree with all files
                toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Task Sent`, description: `// AI is processing creation of: ${name}. Review output.`, className: "font-mono" });
            } else {
                toast({ variant: "default", title: `AI Note`, description: `AI did not return specific files for "${name}" (this might be okay for folder creation if structure was implied). Check file explorer.`, className: "font-mono" });
                 // Even if no files are explicitly returned, if a folder was requested, we might need to update the tree if the LLM *should* have made it.
                 // For now, we rely on the LLM to return file objects even for empty folders (e.g. a .gitkeep file)
            }
             setValidationStatus("CREATE_TASK_OK");
        } catch (error: any) {
            toast({ variant: "destructive", title: `Error Creating ${type}`, description: error.message, className: "font-mono" });
            setValidationStatus("ERR_CREATE_FAILED");
        } finally {
            setIsLoading(false);
        }
    };
    
    const buildFileTree = (files: FileObject[]): FileTreeNode => {
        const root: FileTreeNode = { name: 'Project Root', path: '/', type: 'folder', children: [] };
        if (!files || files.length === 0) return root; // Return empty root if no files

        const map: { [key: string]: FileTreeNode } = { '/': root };

        files.sort((a, b) => a.filePath.localeCompare(b.filePath)); 

        for (const file of files) {
            const parts = file.filePath.replace(/^\/+|\/+$/g, '').split('/').filter(p => p); // Normalize path
            let currentPathSoFar = ''; // Tracks the full path to the current part
            let parentNode = root;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLastPart = i === parts.length - 1;
                const nodePathKey = (currentPathSoFar ? currentPathSoFar + '/' : '') + part;

                if (!map[nodePathKey]) {
                    const newNode: FileTreeNode = {
                        name: part,
                        path: nodePathKey, // Store the full path for selection
                        type: isLastPart ? 'file' : 'folder',
                        children: isLastPart ? undefined : [],
                        content: isLastPart ? file.content : undefined,
                    };
                    parentNode.children = parentNode.children || [];
                    // Sort children for consistent display
                    parentNode.children.push(newNode);
                    parentNode.children.sort((a,b) => {
                        if (a.type === 'folder' && b.type === 'file') return -1;
                        if (a.type === 'file' && b.type === 'folder') return 1;
                        return a.name.localeCompare(b.name);
                    });
                    map[nodePathKey] = newNode;
                } else {
                     // If node exists, update its type/content if we're at the last part and it's a file
                    if (isLastPart && map[nodePathKey].type === 'folder' && file.content !== undefined) { // A folder becoming a file
                        map[nodePathKey].type = 'file';
                        map[nodePathKey].content = file.content;
                        map[nodePathKey].children = undefined;
                    } else if (isLastPart && map[nodePathKey].type === 'file') { // Updating existing file content
                        map[nodePathKey].content = file.content;
                    }
                }
                parentNode = map[nodePathKey];
                currentPathSoFar = nodePathKey;
            }
        }
        return root;
    };

    const renderFileTree = (node: FileTreeNode, level = 0): React.ReactNode => {
        return (
            <div key={node.path} style={{ paddingLeft: `${level * 12}px` }} className="text-xs font-mono"> {/* Reduced padding */}
                <div
                    onClick={() => node.type === 'file' && handleFileSelect(node.path)}
                    onDoubleClick={() => node.type === 'file' && openEditPopup()} // Optional: double click to edit
                    className={cn(
                        "cursor-pointer p-0.5 hover:bg-accent/10 rounded-none flex items-center group",
                        activeFilePath === node.path && "bg-accent/20 text-accent"
                    )}
                    title={node.path} // Show full path on hover
                >
                    {node.type === 'folder' ? <ListTree className="h-3 w-3 mr-1.5 opacity-60 group-hover:opacity-90" /> : <FileCode2 className="h-3 w-3 mr-1.5 opacity-60 group-hover:opacity-90" />}
                    <span className="truncate max-w-[150px] group-hover:max-w-none">{node.name}</span> {/* Truncate long names */}
                </div>
                {node.children && node.children.map(child => renderFileTree(child, level + 1))}
            </div>
        );
    };


    const handleTerminalCommand = (command: string) => {
        const lowerCommand = command.toLowerCase().trim();
        let outputMessage = `> ${command}\n`;

        if (lowerCommand === "clear" || lowerCommand === "cls") {
            setTerminalOutput([]);
            outputMessage += `// Terminal Cleared.\n`;
        } else if (lowerCommand.startsWith("ollama list")) {
            outputMessage += `// Simulating 'ollama list':\n${ollamaModels.map(m => `  - ${m.name} (Size: ${(m.size / 1e9).toFixed(2)}GB)`).join('\n') || "  No Ollama models detected."}\n`;
        } else if (lowerCommand.startsWith("ollama pull ")) {
            const modelToPull = command.substring("ollama pull ".length).trim();
            outputMessage += `// Simulating 'ollama pull ${modelToPull}': Request sent. Check Ollama server logs for progress. (Actual pull must be done in system terminal)\n`;
        } else if (lowerCommand === "help") {
            outputMessage += `// CodeSynth Terminal Help:\n  - 'clear' or 'cls': Clear terminal output.\n  - 'ollama list': Show detected Ollama models.\n  - 'ollama pull <model>': Simulate model pull command.\n  - 'theme light/dark': Switch UI theme.\n  - 'settings open/close': Toggle settings panel.\n  - Other commands are simulated.\n`;
        } else if (lowerCommand.startsWith("theme ")) {
            const newTheme = lowerCommand.substring("theme ".length).trim() as 'light' | 'dark';
            if (newTheme === 'light' || newTheme === 'dark') {
                toggleTheme();
                outputMessage += `// Theme switched to ${newTheme}.\n`;
            } else {
                 outputMessage += `// Invalid theme. Use 'theme light' or 'theme dark'.\n`;
            }
        } else if (lowerCommand === "settings open") {
             setShowSettingsPanel(true);
             outputMessage += `// Settings panel opened.\n`;
        } else if (lowerCommand === "settings close") {
            setShowSettingsPanel(false);
            outputMessage += `// Settings panel closed.\n`;
        }
        else {
            outputMessage += `// Simulated output for: ${command}\n`;
        }
        setTerminalOutput(prev => [...prev, outputMessage]);
        setTerminalInput("");
    };


    const currentActiveFileForDisplay: DisplayableFile | DisplayableFile[] | null = activeFilePath
    ? generatedFiles?.find(f => f.filePath === activeFilePath) || null
    : generatedFiles;


    return (
        <SidebarProvider>
            <Sidebar className="w-60 md:w-64 group/sidebar border-r-2 border-border/30" collapsible="icon"> {/* Slightly wider sidebar */}
                <SidebarHeader className="p-2.5 space-y-1 border-b-2 border-border/30"> {/* Increased padding & border */}
                    <div className="font-bold text-lg text-primary chromatic-aberration-light" data-text="CodeSynth">
                        CodeSynth
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">// Retro AI IDE v0.9</p>
                    <SidebarTrigger className="md:hidden absolute top-2.5 right-2.5" />
                </SidebarHeader>

                <SidebarContent className="p-1.5 space-y-1.5"> {/* Adjusted padding */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="agents">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-1.5 rounded-none data-[state=open]:bg-accent/10"> {/* Adjusted padding */}
                                <BrainCircuit className="h-4 w-4 mr-2 text-accent" /> AI Agents
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0">
                                <ScrollArea className="h-[180px] pr-1.5"> {/* Increased height */}
                                <div className="space-y-0.5"> {/* Reduced spacing */}
                                    {AVAILABLE_AGENTS.map(agent => (
                                        <Button
                                            key={agent.id}
                                            variant={activeAgent?.id === agent.id ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs font-mono rounded-none h-7 px-1.5" // Adjusted height/padding
                                            onClick={() => {
                                                setActiveAgent(agent === activeAgent ? null : agent);
                                                setAgentTaskInput(""); // Clear input when switching agents
                                                }}
                                            title={agent.description}
                                        >
                                            <agent.icon className="h-3.5 w-3.5 mr-1.5"/> {agent.name}
                                            {(agent.name.includes('(Conceptual)') || agent.description.includes('(Conceptual)')) && <Badge variant="outline" className="ml-auto text-[0.55rem] px-1 py-0 opacity-70 border-dashed">Concept</Badge>}
                                        </Button>
                                    ))}
                                </div>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {activeAgent && (
                        <Card className="rounded-none bg-card/60 border-border/60 group-data-[collapsible=icon]:hidden">
                            <CardHeader className="p-1.5 border-b border-border/40"> {/* Adjusted padding */}
                                <CardTitle className="text-sm font-mono flex items-center">
                                    <activeAgent.icon className="h-4 w-4 mr-1.5 text-accent"/>
                                    {activeAgent.name} Task
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-1.5 text-xs"> {/* Adjusted padding */}
                                <ScrollArea className="h-[160px] pr-1.5 mb-1"> {/* Increased height */}
                                {(agentChatHistory[activeAgent.id] || []).map((entry, i) => (
                                    <div key={i} className="mb-1.5 border-b border-dashed border-muted/20 pb-1">
                                        <p><span className="text-secondary">// User:</span> {entry.user} <span className="text-muted-foreground text-[0.65rem] float-right">{entry.timestamp}</span></p>
                                        <p><span className="text-primary">// {activeAgent.name}:</span> {entry.ai}</p>
                                    </div>
                                ))}
                                {agentChatHistory[activeAgent.id]?.length === 0 && <p className="text-muted-foreground text-center italic">No tasks initiated for {activeAgent.name} yet.</p>}
                                {isAgentProcessing && <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin text-primary"/></div>}
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="p-1.5 border-t border-border/40"> {/* Adjusted padding */}
                                <div className="w-full space-y-1">
                                <Textarea
                                    placeholder={activeAgent.placeholderTask || `Describe task for ${activeAgent.name}...`}
                                    value={agentTaskInput}
                                    onChange={(e) => setAgentTaskInput(e.target.value)}
                                    rows={2}
                                    className="text-xs font-mono bg-input/80 rounded-none terminal-input p-1.5" // Adjusted padding
                                    disabled={isAgentProcessing}
                                />
                                <Button size="sm" onClick={handleAgentTaskSubmit} disabled={isAgentProcessing || !agentTaskInput.trim()} className="w-full btn-neon-accent text-xs rounded-none h-7"> {/* Use Accent button */}
                                    {isAgentProcessing ? <><Loader2 className="h-3 w-3 animate-spin mr-1"/>Sending...</> : "Execute Task"}
                                </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )}

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="files">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-1.5 rounded-none data-[state=open]:bg-accent/10"> {/* Adjusted padding */}
                                <Files className="h-4 w-4 mr-2 text-accent" /> File Explorer
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0">
                                <div className="flex gap-1 mb-1 px-0.5">
                                    <Button variant="ghost" size="xs" className="flex-1 text-[0.65rem] rounded-none h-6 btn-neon-secondary" onClick={() => handleCreateFileOrFolder('file')}>+ File (AI)</Button> {/* Neon effect */}
                                    <Button variant="ghost" size="xs" className="flex-1 text-[0.65rem] rounded-none h-6 btn-neon-secondary" onClick={() => handleCreateFileOrFolder('folder')}>+ Folder (AI)</Button> {/* Neon effect */}
                                </div>
                                <ScrollArea className="h-[180px] pr-1.5 border-t border-border/40 pt-1"> {/* Increased height */}
                                    {fileTree && fileTree.children && fileTree.children.length > 0 ? renderFileTree(fileTree) : <p className="text-xs text-muted-foreground p-1 italic text-center">// No files generated yet.</p>}
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="vcs">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-1.5 rounded-none data-[state=open]:bg-accent/10"> {/* Adjusted padding */}
                                <GitBranch className="h-4 w-4 mr-2 text-accent" /> Version Control
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0 text-xs font-mono space-y-1 px-0.5">
                                <p>Status: <span className="text-secondary">{gitStatus}</span></p>
                                <Input placeholder="// Commit message..." value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="text-xs rounded-none bg-input/80 terminal-input h-7 p-1.5"/> {/* Adjusted padding */}
                                <Button size="sm" className="w-full btn-neon-primary text-xs rounded-none h-7" onClick={() => { setGitStatus("Changes Committed (Simulated)"); toast({title: "VCS Commit (Simulated)", description: commitMessage || "// No message provided."}); setCommitMessage(""); }}>Commit Changes</Button> {/* Use Primary button */}
                                <Button variant="ghost" size="sm" className="w-full text-xs rounded-none h-7">View History (N/A)</Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Separator className="my-1.5 border-border/40 group-data-[collapsible=icon]:hidden"/> {/* Adjusted margin */}
                    <div className="group-data-[collapsible=icon]:hidden text-xs font-mono text-muted-foreground p-1.5"> {/* Adjusted padding */}
                        <p>// Main Navigation</p>
                    </div>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Dashboard" isActive={true} size="sm" className="h-7"> {/* Smaller size */}
                                <LayoutDashboard /> <span>Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Cloud Deployments (Firebase/GCP)" size="sm" className="h-7"> {/* Smaller size */}
                                <Cloud /> <span>Deployments</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Authentication Management (Conceptual)" size="sm" className="h-7"> {/* Smaller size */}
                                <Users/> <span>Auth Manager</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton tooltip="MLOps & Experiment Tracking (Conceptual)" size="sm" className="h-7"> {/* Smaller size */}
                                <Microscope/> <span>MLOps</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter className="p-1.5 border-t-2 border-border/30"> {/* Adjusted padding */}
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowSettingsPanel(true)} className="w-full btn-neon text-xs rounded-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-7 h-7"> {/* Use Teal button, smaller */}
                            <Settings className="mr-0 md:mr-1.5 h-3.5 w-3.5 group-data-[collapsible=icon]:mr-0" />
                            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                        </Button>
                         <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full btn-neon-secondary text-xs rounded-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-7 h-7"> {/* Smaller */}
                            <Palette className="mr-0 md:mr-1.5 h-3.5 w-3.5 group-data-[collapsible=icon]:mr-0" />
                             <span className="group-data-[collapsible=icon]:hidden">Toggle Theme</span>
                        </Button>
                    </div>
                </SidebarFooter>
                 <SidebarRail />
            </Sidebar>


            <SidebarInset className="flex flex-col">
                <header className="p-2.5 border-b-2 border-border flex items-center justify-between flex-shrink-0"> {/* Adjusted padding */}
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1"> {/* Allow wrapping */}
                        <Label htmlFor="model-select" className="text-sm font-mono mr-1.5 whitespace-nowrap text-primary">// Model_Select:</Label> {/* Use Primary color */}
                        <Select
                            value={selectedModelId}
                            onValueChange={setSelectedModelId}
                            disabled={isLoading} // Disable during loading
                        >
                            <SelectTrigger id="model-select" className="bg-input border-border rounded-none text-xs font-mono min-w-[160px] max-w-[280px] h-7 py-0 px-2"> {/* Smaller height/padding */}
                                <SelectValue placeholder="// Select Model..." />
                            </SelectTrigger>
                            <SelectContent className="font-mono text-xs rounded-none max-h-[300px]">
                                <SelectGroup>
                                    <SelectLabel className="font-mono text-xs text-muted-foreground">// Available Models</SelectLabel>
                                    {allModels.length > 0 ? allModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id} disabled={model.unavailable} className="py-1 px-2 hover:bg-accent/20 text-xs h-7"> {/* Smaller height */}
                                            <div className="flex items-center">
                                                {getProviderIcon(model.provider)}
                                                <span>{model.name}</span>
                                                {model.unavailable && <Badge variant="destructive" className="ml-auto text-[0.6rem] px-1 py-0">Unavailable</Badge>}
                                            </div>
                                        </SelectItem>
                                    )) : (
                                         <SelectItem value="no-models" disabled className="py-1 px-2 text-xs h-7"> {/* Smaller height */}
                                            {modelError ? "// Error loading models" : "// No models available/loading..."}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                                {modelError && <p className="text-destructive text-xs p-2 bg-destructive/10 border-t border-destructive">{modelError}</p>}
                            </SelectContent>
                        </Select>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={fetchAndSetOllamaModels} disabled={isLoading || !appSettings.ollamaBaseUrl} className="ml-0.5 hover:bg-accent/10 w-7 h-7 p-1 rounded-none border border-transparent hover:border-accent neon-glow"> {/* Smaller size */}
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="font-mono text-xs">
                                    {appSettings.ollamaBaseUrl ? "Refresh Ollama Model List" : "Configure Ollama URL in Settings to enable refresh"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="hidden md:block">
                        <SidebarTrigger />
                    </div>
                </header>

                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-1.5 md:p-2 gap-1.5 md:gap-2"> {/* Adjusted padding/gap */}
                    {/* Left Side: Prompt Input */}
                    <div className="lg:w-1/3 flex flex-col gap-2 h-full"> {/* Adjusted gap */}
                        <PromptInput
                            prompt={prompt}
                            setPrompt={setPrompt}
                            onSubmit={() => handleCodeGeneration()}
                            isLoading={isLoading}
                            placeholderText="// System Prompt: Describe application, files, features..."
                            buttonText="Generate" // Shorter button text
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block mx-0.5 border-l-2 border-border/50 flex-shrink-0"></div> {/* Adjusted margin/border */}
                    <div className="lg:hidden my-0.5 border-b-2 border-border/50 flex-shrink-0"></div> {/* Adjusted margin/border */}

                    {/* Right Side: Code Display */}
                    <div className="lg:w-2/3 flex-grow flex flex-col overflow-hidden h-full">
                        <CodeDisplay
                            files={currentActiveFileForDisplay} 
                            activeFilePath={activeFilePath} 
                            isLoading={isLoading}
                            containerClassName="flex-grow border-2 border-input shadow-inner" // Added border/shadow
                        />
                        <div className="mt-1.5 flex justify-end flex-shrink-0"> {/* Adjusted margin */}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={openEditPopup}
                                disabled={isLoading || !activeFilePath || activeFilePath.includes("ERROR.log") || !generatedFiles || generatedFiles.length === 0}
                                className="rounded-none btn-neon-secondary text-xs h-7" // Adjusted height
                            >
                                Edit Active File
                            </Button>
                        </div>
                    </div>
                </main>

                {isEditPopupOpen && activeFilePath && generatedFiles?.find(f => f.filePath === activeFilePath) && (
                    <EditPopup
                        initialCode={generatedFiles.find(f => f.filePath === activeFilePath)?.content || ""}
                        filePathToEdit={activeFilePath}
                        onSubmit={handleEditSubmit}
                        onClose={() => setIsEditPopupOpen(false)}
                        isLoading={isLoading}
                        selectedModelId={selectedModelId}
                    />
                )}

                {showSettingsPanel && (
                    <SettingsPanel onClose={() => { setShowSettingsPanel(false); fetchAndSetOllamaModels(); }} />
                )}

                <Accordion type="single" collapsible className="w-full flex-shrink-0 border-t-2 border-border">
                    <AccordionItem value="terminal">
                        <AccordionTrigger className="text-sm font-mono hover:no-underline p-1.5 rounded-none bg-card/40 hover:bg-card/60 data-[state=open]:bg-card/60"> {/* Adjusted padding/bg */}
                            <Terminal className="h-3.5 w-3.5 mr-1.5 text-primary"/> // System_Terminal //
                        </AccordionTrigger>
                        <AccordionContent className="p-1.5 bg-black text-xs font-mono text-primary/90 max-h-[130px] overflow-y-auto"> {/* Adjusted padding/height */}
                            <ScrollArea className="h-[110px] pr-1.5"> {/* Adjusted height */}
                            {terminalOutput.map((line, i) => <pre key={i} className="whitespace-pre-wrap break-words leading-tight text-[0.7rem]">{line}</pre>)}
                            </ScrollArea>
                            <div className="flex mt-1 items-center">
                                <span className="text-primary mr-1 font-bold text-sm">&gt;</span>
                                <Input
                                    type="text"
                                    value={terminalInput}
                                    onChange={(e) => setTerminalInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleTerminalCommand(terminalInput); }}
                                    className="bg-transparent border-none text-primary focus:ring-0 p-0 h-auto text-xs flex-grow terminal-input focus:outline-none shadow-none" // Simplified input
                                    placeholder="// Enter command..."
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Footer */}
                <footer className="pt-1 pb-0.5 mt-auto border-t-2 border-border text-center text-[0.65rem] text-muted-foreground font-mono flex-shrink-0"> {/* Smaller text */}
                 [ CodeSynth v0.9 | Providers: {getProviderNames(allModels, modelError, appSettings, POTENTIAL_CLOUD_MODELS)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
                </footer>
             </SidebarInset>
        </SidebarProvider>
    );
}

// Helper function to derive active provider names (moved from utils to reduce complexity/dependencies for now)
// function getProviderNames(
//     allModels: CombinedModel[],
//     ollamaError: string | null,
//     appSettings: AppSettings,
//     potentialCloudModels: ModelMetadata[]
// ): string {
//   const providers = new Set<string>();

//   const hasGoogleKey = !!appSettings.googleApiKey;
//   const openRouterMeta = potentialCloudModels.find(pm => pm.provider === 'OpenRouter');
//   const huggingFaceMeta = potentialCloudModels.find(pm => pm.provider === 'Hugging Face');
//   const hasOpenRouterKey = !!appSettings.openRouterApiKey;
//   const hasHuggingFaceKey = !!appSettings.huggingFaceApiKey;

//   // Check Google AI
//   if (hasGoogleKey && allModels.some(m => m.provider === 'Google AI' && !m.unavailable)) {
//     providers.add('Google');
//   }
//   // Check OpenRouter
//   if (hasOpenRouterKey && !openRouterMeta?.unavailable && allModels.some(m => m.provider === 'OpenRouter' && !m.unavailable)) {
//     providers.add('OpenRouter');
//   }
//   // Check Hugging Face
//   if (hasHuggingFaceKey && !huggingFaceMeta?.unavailable && allModels.some(m => m.provider === 'Hugging Face' && !m.unavailable)) {
//     providers.add('HF');
//   }
//   // Check Ollama
//   const ollamaConfigured = !!appSettings.ollamaBaseUrl;
//   const ollamaCriticallyFailed = ollamaError && (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused") || ollamaError.includes("Ollama Base URL is not configured"));
//   if (ollamaConfigured && !ollamaCriticallyFailed && allModels.some(m => m.provider === 'Ollama' && !m.unavailable)) {
//       providers.add('Ollama');
//   }

//   if (providers.size === 0) {
//     if (ollamaError) {
//         if (ollamaError.includes("Ollama Base URL is not configured")) return "Ollama ?";
//         if (ollamaError.toLowerCase().includes("failed to connect") || ollamaError.toLowerCase().includes("connection refused")) return "Ollama Offline";
//         return "Ollama Err";
//     }
//     if (!hasGoogleKey && !hasOpenRouterKey && !hasHuggingFaceKey && !ollamaConfigured) {
//         return "None Cfg";
//     }
//     let unavailableMessages = [];
//     if (hasOpenRouterKey && openRouterMeta?.unavailable) unavailableMessages.push("OR Plugin X");
//     if (hasHuggingFaceKey && huggingFaceMeta?.unavailable) unavailableMessages.push("HF Plugin X");
//     if (unavailableMessages.length > 0) return unavailableMessages.join(', ') + ( (hasGoogleKey || ollamaConfigured) ? " + No Models" : "");

//     return "No Models";
//   }

//   let result = Array.from(providers).sort().join(', ');

//   // Append warnings concisely
//   if (hasOpenRouterKey && openRouterMeta?.unavailable && !providers.has('OpenRouter')) result += ", OR(X)";
//   if (hasHuggingFaceKey && huggingFaceMeta?.unavailable && !providers.has('HF')) result += ", HF(X)";
//   if (ollamaConfigured && ollamaCriticallyFailed) result += ", Ollama(Offline)";
//   else if (ollamaConfigured && !providers.has('Ollama') && ollamaError) result += ", Ollama(Err)";


//   return result || "Status ?";
// }


// --- Placeholder Implementations for Advanced Features ---

// TODO: Implement robust File Explorer features (DnD, multi-tabs, search, bookmarks)
// TODO: Integrate Monaco Editor properly with all its features
// TODO: Implement Git/VCS integration (sync, diff, history)
// TODO: Implement Zero-Error Validation Pipeline (syntax, deps, tests)
// TODO: Implement Firebase/Cloud Deployment features
// TODO: Build Plugin System architecture
// TODO: Implement MLOps integration (experiment tracking, observability)
// TODO: Implement Security Scanning integration
// TODO: Implement Advanced AI Agent Capabilities (long-term memory, complex tasks)
// TODO: Add advanced animations (rotary knobs, tape sliders, parallax)
// TODO: Implement performance optimizations (lazy loading, caching)
