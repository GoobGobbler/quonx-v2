
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrainCircuit, Code, Construction, FileCode2, GitBranch, HardDrive, LayoutDashboard,
  LayoutPanelLeft, ListChecks, LucideIcon, Palette, Rocket, Settings, Terminal, Users,
  CloudCog, Binary, RefreshCcw, ListTree, Cloud, TestTube2, ShieldCheck, Files // Added Files icon
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
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { generateCodeFromPrompt, type FileObject } from '@/ai/flows/generate-code-from-prompt'; // Import FileObject type
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar, SidebarProvider } from "@/components/ui/sidebar"; // Added SidebarProvider import
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
    { id: 'openrouter/anthropic/claude-3-haiku', provider: 'OpenRouter', name: 'Claude 3 Haiku (OpenRouter)', unavailable: true },
    { id: 'huggingface/codellama/CodeLlama-7b-hf', provider: 'Hugging Face', name: 'CodeLlama-7b-hf (HF)', unavailable: true },
];

interface Agent {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    capabilities: string[];
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
    {
        id: 'security-analyst',
        name: 'Security Analyst',
        description: 'Scans code for vulnerabilities, suggests secure coding practices, and reviews dependencies.',
        icon: ShieldCheck,
        capabilities: ['vulnerability_scanning', 'secure_code_review', 'dependency_check'],
    },
    {
        id: 'firebase-expert',
        name: 'Firebase Expert',
        description: 'Helps scaffold Firebase features (Auth, Firestore, Functions), configure rules, and set up deployments.',
        icon: Rocket, // Using Rocket as a placeholder for Firebase related tasks
        capabilities: ['firestore_schema_generation', 'firebase_auth_setup', 'functions_scaffolding', 'hosting_config'],
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
    const [prompt, setPrompt] = useState<string>("// Enter prompt: Describe application, file structure, features...");
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

    const [validationStatus, setValidationStatus] = useState<string>("VALIDATION_OK");
    const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark

    const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
    const [agentChatHistory, setAgentChatHistory] = useState<Record<string, { user: string; ai: string }[]>>({});
    const [agentTaskInput, setAgentTaskInput] = useState("");
    const [isAgentProcessing, setIsAgentProcessing] = useState(false);

    const [fileTree, setFileTree] = useState<FileTreeNode | null>(null); // Placeholder for generated file tree
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null); // Path of the active file being displayed/edited

    const [gitStatus, setGitStatus] = useState<string>("No repo initialized");
    const [commitMessage, setCommitMessage] = useState("");

    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [terminalInput, setTerminalInput] = useState("");


    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        toast({ title: `Theme switched to ${newTheme === 'light' ? 'Dark' : 'Light'}`, description: "Visual theme updated.", className: "font-mono" });
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
            document.body.classList.toggle('scanlines-effect', appSettings.enableScanlines);
            document.body.classList.toggle('grain-effect', appSettings.enableGrain);
            // Glow is applied via specific classes like .neon-glow
        } catch (error) {
            console.error("Failed to save settings or apply effects:", error);
        }
    }, [appSettings]);

     const fetchAndSetOllamaModels = useCallback(async () => {
        if (!appSettings.ollamaBaseUrl) {
            console.warn("Ollama Base URL is not configured. Skipping Ollama model fetch.");
            setModelError("Ollama Base URL is not configured. Check Settings.");
            setOllamaModels([]);
            return;
        }
        try {
            console.log("[page] Attempting to fetch Ollama models from:", appSettings.ollamaBaseUrl);
            const models = await listLocalOllamaModels(appSettings.ollamaBaseUrl);
            setOllamaModels(models);
            setModelError(null);
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
    }, [fetchAndSetOllamaModels]);


    useEffect(() => {
        const combined: CombinedModel[] = [];
        ollamaModels.forEach(model => {
            combined.push({
                id: `ollama/${model.name}`, // Ensure 'ollama/' prefix
                provider: 'Ollama',
                name: model.name,
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
                const firstOllama = combined.find(m => m.provider === 'Ollama' && !m.unavailable);
                const firstGoogle = combined.find(m => m.provider === 'Google AI' && !m.unavailable);
                
                if (firstOllama && (!modelError || (!modelError.includes("Failed to connect") && !modelError.includes("Ollama Base URL is not configured")))) {
                    setSelectedModelId(firstOllama.id);
                } else if (firstGoogle) {
                    setSelectedModelId(firstGoogle.id);
                } else {
                    const firstAvailable = combined.find(m => !m.unavailable);
                    setSelectedModelId(firstAvailable ? firstAvailable.id : (combined[0]?.id || ''));
                }
            }
        } else {
            setSelectedModelId('');
        }
        console.log(`[page] Combined model list updated. Total models: ${combined.length}. Selected: ${selectedModelId}`);

    }, [ollamaModels, appSettings.googleApiKey, appSettings.openRouterApiKey, appSettings.huggingFaceApiKey, selectedModelId, modelError, appSettings.ollamaBaseUrl]); // Added ollamaBaseUrl dependency

    const handleCodeGeneration = async (currentPrompt?: string) => {
        const promptToUse = typeof currentPrompt === 'string' ? currentPrompt : prompt;
        if (!promptToUse.trim()) {
            toast({ variant: "destructive", title: "Input Error", description: "Prompt cannot be empty.", className: "font-mono" });
            return;
        }
        setIsLoading(true);
        setGeneratedFiles(null); // Clear previous files
        // setPreviousFileContent(generatedFiles ? generatedFiles[0]?.content : null); // Save current code (of first file)
        setValidationStatus("VALIDATING_PROMPT...");

        try {
            if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected. Please choose one.");
            }
            setValidationStatus(`SENDING_TO_${selectedModelId.toUpperCase()}...`);
            const output = await generateCodeFromPrompt({
                prompt: promptToUse,
                previousCode: previousFileContent || undefined,
                modelName: selectedModelId,
            });

            setGeneratedFiles(output.files);
            if (output.files.length > 0) {
                setActiveFilePath(output.files[0].filePath); // Set first file as active
                setPreviousFileContent(output.files[0].content); // Update previous code for potential edits
                 // Build a conceptual file tree
                const tree = buildFileTree(output.files);
                setFileTree(tree);
            } else {
                setActiveFilePath(null);
                setFileTree(null);
            }
            setValidationStatus("GENERATION_OK");
            console.log("[page] Code generation completed successfully. Files:", output.files.map(f => f.filePath));
            toast({
                title: "SYS: AI Generation OK",
                description: `${output.files.length} file(s) generated with ${selectedModelId}. Review and validate!`,
                className: "font-mono border-primary text-primary",
            });

        } catch (error: any) {
            console.error("[page] Code generation failed:", error);
            const errorMessage = error.message || "An unknown error occurred during generation.";
            // Display error in a single "error file"
            setGeneratedFiles([{ filePath: "ERROR.txt", content: `// AI_GENERATION_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// Error: ${errorMessage}\n// --- Previous Code Context (if any) ---\n${previousFileContent || '// No previous code context.'}` }]);
            setActiveFilePath("ERROR.txt");
            setFileTree(null);
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
        setIsEditPopupOpen(false);
        setValidationStatus("EDIT_IN_PROGRESS...");

        // Determine current content for editing
        const currentContentToEdit = generatedFiles?.find(f => f.filePath === activeFilePath)?.content || previousFileContent;

        try {
             if (!selectedModelId) {
                setValidationStatus("ERR_NO_MODEL");
                throw new Error("No AI model selected for editing. Please choose one.");
            }
            setValidationStatus(`SENDING_EDIT_TO_${selectedModelId.toUpperCase()}...`);
            const output = await generateCodeFromPrompt({
                prompt: newEditPrompt, // The edit instruction is the new prompt
                previousCode: currentContentToEdit || undefined, // Current active file's code is context
                modelName: selectedModelId,
            });

            if (output.files && output.files.length > 0) {
                // Assume edit modifies the active file or generates a related one.
                // For simplicity, replace/update the active file or add new ones.
                // A more sophisticated approach would involve diffing or specific instructions from AI.
                setGeneratedFiles(prevFiles => {
                    const newFiles = [...(prevFiles || [])];
                    output.files.forEach(newFile => {
                        const existingIndex = newFiles.findIndex(f => f.filePath === newFile.filePath);
                        if (existingIndex !== -1) {
                            newFiles[existingIndex] = newFile; // Update existing
                        } else {
                            newFiles.push(newFile); // Add new
                        }
                    });
                    return newFiles;
                });
                setActiveFilePath(output.files[0].filePath); // Focus on the first (potentially modified) file
                setPreviousFileContent(output.files[0].content);
                setFileTree(buildFileTree(generatedFiles || [])); // Rebuild tree
            }

            setValidationStatus("EDIT_OK");
            toast({
                title: "SYS: AI Edit OK",
                description: `Code edited with ${selectedModelId}.`,
                className: "font-mono border-primary text-primary",
            });
        } catch (err: any) {
            const errorMessage = err.message || "An unknown error occurred during edit.";
            const errorFileContent = `// AI_EDIT_ERROR //\n// Model: ${selectedModelId || 'None Selected'}\n// Error: ${errorMessage}\n// --- Original Code ---\n${currentContentToEdit || '// No original code.'}`;
            setGeneratedFiles([{ filePath: "EDIT_ERROR.txt", content: errorFileContent }]);
            setActiveFilePath("EDIT_ERROR.txt");
            setFileTree(null);
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
    }, [generatedFiles, activeFilePath, selectedModelId, toast, previousFileContent]);


    const handleAgentTaskSubmit = async () => {
        if (!activeAgent || !agentTaskInput.trim()) {
            toast({ variant: "destructive", title: "Agent Error", description: "No agent selected or task is empty.", className: "font-mono" });
            return;
        }
        setIsAgentProcessing(true);
        setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_PROCESSING...`);
        
        let taskResult = `Processed task for ${activeAgent.name}: "${agentTaskInput}" (Simulated)`;

        // Conceptual: Call specific agent flows based on activeAgent.id
        // For now, we just simulate. If it's Code Assistant and "generate unit tests", it could modify the prompt.
        if (activeAgent.id === 'code-assistant' && agentTaskInput.toLowerCase().includes('unit test')) {
            const currentCode = generatedFiles?.find(f => f.filePath === activeFilePath)?.content;
            if (currentCode) {
                const testPrompt = `Generate unit tests for the following ${activeFilePath?.split('.').pop() || 'code'}:\n\n\`\`\`\n${currentCode}\n\`\`\`\n\n${agentTaskInput}`;
                // Set prompt and trigger generation.
                setPrompt(testPrompt);
                handleCodeGeneration(testPrompt); // Trigger generation
                taskResult = `Task routed to main generator for unit tests based on: "${agentTaskInput}"`;
            } else {
                taskResult = "No active code to generate tests for.";
            }
        } else if (activeAgent.id === 'project-architect' && agentTaskInput.toLowerCase().includes('scaffold')) {
             // Example: "scaffold a new Next.js page named 'about'"
            setPrompt(agentTaskInput); // Use architect's input as the main prompt
            handleCodeGeneration(agentTaskInput); // Trigger generation
            taskResult = `Project Architect task routed to main generator: "${agentTaskInput}"`;
        }
        // ... other agent capabilities would be routed here

        setAgentChatHistory(prev => ({
            ...prev,
            [activeAgent.id]: [...(prev[activeAgent.id] || []), { user: agentTaskInput, ai: taskResult }]
        }));
        setAgentTaskInput("");
        setValidationStatus(`AGENT_${activeAgent.id.toUpperCase()}_OK`);
        toast({ title: `${activeAgent.name} Task Processed`, description: "Agent completed the task.", className: "font-mono" });
        setIsAgentProcessing(false);
    };


    const getProviderIcon = (provider: string): React.ReactNode => {
        const baseClasses = "h-4 w-4 inline-block mr-2 align-middle";
        const commonUnavailableClasses = "opacity-50 group-hover:opacity-75";

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

    const openEditPopup = () => {
        const currentFile = generatedFiles?.find(f => f.filePath === activeFilePath);
        if (!currentFile || currentFile.filePath.includes("ERROR.txt")) {
             toast({
                variant: "destructive",
                title: "Cannot Edit",
                description: "No valid file selected or current file is an error message. Generate or select a file first.",
                className: "font-mono",
            });
            return;
        }
        setEditPrompt("");
        setIsEditPopupOpen(true);
    };

    const handleFileSelect = (filePath: string) => {
        setActiveFilePath(filePath);
        const selectedFile = generatedFiles?.find(f => f.filePath === filePath);
        setPreviousFileContent(selectedFile?.content || null); // Set for editing context
        toast({ title: "File Selected", description: `${filePath} is now active in the editor.`, className: "font-mono" });
    };

    const handleCreateFileOrFolder = async (type: 'file' | 'folder') => {
        const name = window.prompt(`Enter name for new ${type}:`);
        if (!name) return;

        const creationPrompt = type === 'file'
            ? `Create a new file named "${name}". If it's a common file type (e.g., .js, .ts, .css, .md), provide some basic boilerplate content.`
            : `Create a new folder named "${name}". If relevant for a project (e.g., 'components', 'utils'), suggest a common sub-file like an index.js or a placeholder README.md within it.`;

        setIsLoading(true);
        setValidationStatus(`CREATING_${type.toUpperCase()}...`);
        try {
            if (!selectedModelId) throw new Error("No AI model selected.");
            const output = await generateCodeFromPrompt({
                prompt: creationPrompt,
                modelName: selectedModelId,
            });

            if (output.files.length > 0) {
                setGeneratedFiles(prevFiles => [...(prevFiles || []), ...output.files]);
                setActiveFilePath(output.files[0].filePath);
                setFileTree(buildFileTree([...(generatedFiles || []), ...output.files]));
                toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Created`, description: `${name} generated by AI.`, className: "font-mono" });
            } else {
                toast({ variant: "destructive", title: `Failed to Create ${type}`, description: `AI did not return any files for "${name}".`, className: "font-mono" });
            }
             setValidationStatus("CREATE_OK");
        } catch (error: any) {
            toast({ variant: "destructive", title: `Error Creating ${type}`, description: error.message, className: "font-mono" });
            setValidationStatus("ERR_CREATE_FAILED");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Helper to build a simplified tree for display
    const buildFileTree = (files: FileObject[]): FileTreeNode => {
        const root: FileTreeNode = { name: 'Project Root', path: '/', type: 'folder', children: [] };
        const map: { [key: string]: FileTreeNode } = { '/': root };

        files.sort((a, b) => a.filePath.localeCompare(b.filePath)); // Sort for consistent tree structure

        for (const file of files) {
            const parts = file.filePath.split('/').filter(p => p);
            let currentPath = '';
            let parentNode = root;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLastPart = i === parts.length - 1;
                currentPath += (currentPath ? '/' : '') + part;

                if (!map[currentPath]) {
                    const newNode: FileTreeNode = {
                        name: part,
                        path: currentPath,
                        type: isLastPart ? 'file' : 'folder',
                        children: isLastPart ? undefined : [],
                        content: isLastPart ? file.content : undefined,
                    };
                    parentNode.children = parentNode.children || [];
                    parentNode.children.push(newNode);
                    map[currentPath] = newNode;
                }
                parentNode = map[currentPath];
                 if (isLastPart && parentNode.type === 'folder') { // If a folder was created first, then a file at same path
                    parentNode.type = 'file';
                    parentNode.content = file.content;
                    parentNode.children = undefined;
                } else if (isLastPart && parentNode.type === 'file') {
                     parentNode.content = file.content; // Update content if file already exists
                 }

            }
        }
        return root;
    };

    const renderFileTree = (node: FileTreeNode, level = 0): React.ReactNode => {
        return (
            <div key={node.path} style={{ paddingLeft: `${level * 15}px` }} className="text-xs font-mono">
                <div
                    onClick={() => node.type === 'file' && handleFileSelect(node.path)}
                    className={cn(
                        "cursor-pointer p-0.5 hover:bg-accent/10 rounded-none flex items-center",
                        activeFilePath === node.path && "bg-accent/20 text-accent"
                    )}
                >
                    {node.type === 'folder' ? <ListTree className="h-3 w-3 mr-1 opacity-70" /> : <FileCode2 className="h-3 w-3 mr-1 opacity-70" />}
                    {node.name}
                </div>
                {node.children && node.children.map(child => renderFileTree(child, level + 1))}
            </div>
        );
    };


    const handleTerminalCommand = (command: string) => {
        setTerminalOutput(prev => [...prev, `> ${command}`, `Simulated output for: ${command}`]);
        setTerminalInput("");
    };


    const currentActiveFileForDisplay: DisplayableFile | DisplayableFile[] | null = activeFilePath
    ? generatedFiles?.find(f => f.filePath === activeFilePath) || null
    : generatedFiles;


    return (
        <SidebarProvider>
            <Sidebar className="w-64 group/sidebar" collapsible="icon">
                <SidebarHeader className="p-2 space-y-1">
                    <div className="font-bold text-lg text-primary chromatic-aberration-light" data-text="CodeSynth">
                        CodeSynth
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">// Retro AI IDE v0.8</p>
                    <SidebarTrigger className="md:hidden absolute top-2 right-2" />
                </SidebarHeader>

                <SidebarContent className="p-2 space-y-2">
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
                            <CardContent className="p-2 text-xs">
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
                                    placeholder={`Task for ${activeAgent.name}... (e.g., "generate unit tests", "scaffold a new component")`}
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

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="files">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-2 rounded-none">
                                <Files className="h-4 w-4 mr-2" /> File Explorer
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0">
                                <div className="flex gap-1 mb-1">
                                    <Button variant="ghost" size="xs" className="flex-1 text-xs rounded-none" onClick={() => handleCreateFileOrFolder('file')}>+ File (AI)</Button>
                                    <Button variant="ghost" size="xs" className="flex-1 text-xs rounded-none" onClick={() => handleCreateFileOrFolder('folder')}>+ Folder (AI)</Button>
                                </div>
                                <ScrollArea className="h-[150px] pr-2 border-t border-border/30 pt-1">
                                    {fileTree ? renderFileTree(fileTree) : <p className="text-xs text-muted-foreground p-1">// No files generated yet.</p>}
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="vcs">
                            <AccordionTrigger className="text-sm font-mono hover:no-underline hover:text-accent p-2 rounded-none">
                                <GitBranch className="h-4 w-4 mr-2" /> Version Control
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0 text-xs font-mono space-y-1">
                                <p>Status: <span className="text-secondary">{gitStatus}</span></p>
                                <Input placeholder="Commit message..." value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="text-xs rounded-none bg-input/70 terminal-input h-7"/>
                                <Button size="sm" className="w-full btn-neon-secondary text-xs rounded-none h-7" onClick={() => { setGitStatus("Committed (Simulated)"); toast({title: "Commit (Simulated)", description: commitMessage}); setCommitMessage(""); }}>Commit</Button>
                                <Button variant="ghost" size="sm" className="w-full text-xs rounded-none h-7">View History (N/A)</Button>
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
                            <SidebarMenuButton tooltip="Firebase/Cloud Deployments">
                                <Cloud /> <span>Deployments</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton tooltip="User Authentication Management">
                                <Users/> <span>Auth Manager</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter className="p-2 border-t border-border/30">
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowSettingsPanel(true)} className="w-full btn-neon text-xs rounded-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-8">
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


            <SidebarInset className="flex flex-col">
                <header className="p-3 border-b-2 border-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center">
                        <Label htmlFor="model-select" className="text-sm font-mono mr-2 whitespace-nowrap">// AI_Model:</Label>
                        <Select
                            value={selectedModelId}
                            onValueChange={setSelectedModelId}
                        >
                            <SelectTrigger id="model-select" className="bg-input border-border rounded-none text-xs font-mono min-w-[180px] max-w-[300px] h-8">
                                <SelectValue placeholder="Select Model..." />
                            </SelectTrigger>
                            <SelectContent className="font-mono text-xs rounded-none max-h-[300px]">
                                <SelectGroup>
                                    <SelectLabel className="font-mono text-xs">Available Models</SelectLabel>
                                    {allModels.length > 0 ? allModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id} disabled={model.unavailable} className="py-1 px-2 hover:bg-accent/20">
                                            <div className="flex items-center">
                                                {getProviderIcon(model.provider)}
                                                <span>{model.name}</span>
                                                {model.unavailable && <Badge variant="destructive" className="ml-auto text-[0.6rem] px-1 py-0">Unavailable</Badge>}
                                            </div>
                                        </SelectItem>
                                    )) : (
                                         <SelectItem value="no-models" disabled className="py-1 px-2">
                                            {modelError ? "Error loading models" : "No models available or loading..."}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                                {modelError && <p className="text-destructive text-xs p-2">{modelError}</p>}
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
                    <div className="hidden md:block">
                        <SidebarTrigger />
                    </div>
                </header>

                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-2 md:p-3 gap-2 md:gap-3">
                    <div className="lg:w-1/3 flex flex-col gap-3 h-full">
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

                    <div className="lg:w-2/3 flex-grow flex flex-col overflow-hidden h-full">
                        <CodeDisplay
                            files={currentActiveFileForDisplay} // Pass array of files or single active file
                            activeFilePath={activeFilePath} // Pass active file path
                            isLoading={isLoading}
                            containerClassName="flex-grow"
                        />
                        <div className="mt-2 flex justify-end flex-shrink-0">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={openEditPopup}
                                disabled={isLoading || !activeFilePath || activeFilePath.includes("ERROR.txt") || !generatedFiles || generatedFiles.length === 0}
                                className="rounded-none btn-neon-secondary text-xs"
                            >
                                Edit Active File with Prompt
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
                 [ CodeSynth IDE v0.8 | Active Providers: {getProviderNames(allModels, modelError, appSettings, POTENTIAL_CLOUD_MODELS)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
                </footer>
             </SidebarInset>
        </SidebarProvider>
    );
}

