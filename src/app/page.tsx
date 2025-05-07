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
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeDisplay } from "@/components/code-display";
import { PromptInput } from "@/components/prompt-input";
import { EditPopup } from "@/components/edit-popup"; // Import the EditPopup component
import { AppSettings, defaultSettings, SETTINGS_STORAGE_KEY } from '@/components/settings-panel'; // Import settings types and constants
import { SettingsPanel } from '@/components/settings-panel';
import { useToast } from "@/hooks/use-toast";
import { getProviderNames } from '@/lib/utils';
import { listLocalOllamaModels } from '@/lib/ollama-client'; // Client-side import
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
import { generateCodeFromPrompt } from '@/ai/flows/generate-code-from-prompt'; //Import Genkit Flow
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, Copy, Check, Loader2, ExternalLink } from "lucide-react"; // Removed Tooth, Asteroid, Alarm, Asteroid
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
import { Input as InputShad } from "@/components/ui/input"; // Ensure no conflicts
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

// Map from model ID to Model metadata (provider, name, etc.)
type ModelMetadata = {
    id: string;
    provider: string;
    name: string;
    // Add any other properties like description, max tokens, etc.
};
type CombinedModel = {
    id: string;
    provider: string;
    name: string;
    // other properties
};

// Hardcoded model metadata for cloud providers.  These models are always considered AVAILABLE if the cloud provider is generally working.
const POTENTIAL_CLOUD_MODELS: ModelMetadata[] = [
    { id: 'googleai/gemini-1.5-flash-latest', provider: 'Google AI', name: 'Gemini 1.5 Flash (Cloud)' },
    { id: 'googleai/gemini-1.5-pro-latest', provider: 'Google AI', name: 'Gemini 1.5 Pro (Cloud)' },
    { id: 'openrouter/anthropic/claude-3-haiku', provider: 'OpenRouter', name: 'Claude 3 Haiku (OpenRouter)' }, // Added example
    { id: 'huggingface/codellama/CodeLlama-7b-hf', provider: 'Hugging Face', name: 'CodeLlama-7b-hf (HF)' }, // Added example
];

export default function Home() {
    const [prompt, setPrompt] = useState<string>("// Enter prompt: Describe application, file structure, features...");
    const [code, setCode] = useState<string | null>(null); // Store generated code
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditPopupOpen, setIsEditPopupOpen] = useState<boolean>(false); // Controls the edit popup
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [allModels, setAllModels] = useState<CombinedModel[]>([]); // Combined Ollama and Cloud models
    const [selectedModelId, setSelectedModelId] = useState<string>('googleai/gemini-1.5-flash-latest'); // Default model
    const [previousCode, setPreviousCode] = useState<string | null>(null);
    const [ollamaModels, setOllamaModels] = useState<any[]>([]); // State for storing Ollama models
    const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
    const { toast } = useToast(); // Use the hook
    const [modelError, setModelError] = useState<string | null>(null); // Track model loading errors
    const router = useRouter(); // Get router instance
    const searchParams = useSearchParams() // Client hook -> access URL parameters
    const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // or fetch from local storage
    const [validationStatus, setValidationStatus] = useState<string>("OK"); // Example validation status
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const settingsButtonRef = useRef(null);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    }, [theme]);

    // State for visual effect toggles - Consider moving to SettingsPanel if these become user-configurable
    const [enableScanlines, setEnableScanlines] = useState(true); // Example: CRT scanlines effect
    const [enableGrain, setEnableGrain] = useState(true);    // Example: Film grain effect
    const [enableGlow, setEnableGlow] = useState(true);      // Example: Neon glow effect

    // Set default for font here (or retrieve from local storage) - Consider moving to SettingsPanel
    const [font, setFont] = useState('Cutive Mono'); // or load from localStorage
    const baseClasses = "h-4 w-4";

    useEffect(() => {
        // Load settings from localStorage on mount
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                // Merge defaults with stored settings to handle missing/new keys gracefully
                setAppSettings({ ...defaultSettings, ...parsedSettings });
            } else {
                setAppSettings(defaultSettings); // Use defaults if nothing stored
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage:", error);
            setAppSettings(defaultSettings); // Fallback to defaults on error
        }
    }, []);

    // Persist settings to localStorage whenever settings change
    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
        } catch (error) {
            console.error("Failed to save settings to localStorage:", error);
        }
    }, [appSettings]);


    // Fetch Ollama models on component mount (client-side)
    useEffect(() => {
        const fetchOllamaModels = async () => {
            if (!appSettings.ollamaBaseUrl) {
                console.warn("Ollama Base URL is not configured. Skipping Ollama model fetch.");
                setModelError("Ollama Base URL is not configured.");
                return;
            }
            try {
                const models = await listLocalOllamaModels(appSettings.ollamaBaseUrl);
                setOllamaModels(models);
                setModelError(null); // Clear any previous errors
                console.log(`[page] Successfully fetched ${models.length} Ollama models.`);
            } catch (error: any) {
                console.error('[page] Error fetching Ollama models:', error);
                setModelError(error.message || "Failed to fetch Ollama models. Check console.");
                setOllamaModels([]); // Ensure empty array on error
                toast({
                    variant: "destructive",
                    title: "Ollama Connection Error",
                    description: `Could not connect to Ollama. Check Settings. Details: ${error.message}`,
                    className: "font-mono",
                });
            }
        };

        // Fetch immediately on mount
        fetchOllamaModels();

    }, [appSettings.ollamaBaseUrl, toast]); // Refetch if base URL changes


    // Update combined model list whenever Ollama models or API keys change
    useEffect(() => {
        const combined: CombinedModel[] = [];

        // Add Ollama models (prefix with "ollama/")
        ollamaModels.forEach(model => {
            combined.push({
                id: `ollama/${model.name}`,
                provider: 'Ollama',
                name: model.name,
            });
        });

        // Add cloud models only if API keys are present
        if (appSettings.googleApiKey) {
            POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Google AI').forEach(m => combined.push(m));
        }
        if (appSettings.openRouterApiKey) {
            POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'OpenRouter').forEach(m => combined.push(m));
        }
        if (appSettings.huggingFaceApiKey) {
            POTENTIAL_CLOUD_MODELS.filter(m => m.provider === 'Hugging Face').forEach(m => combined.push(m));
        }

        setAllModels(combined);
        console.log(`[page] Combined model list updated. Total models: ${combined.length}`);
    }, [ollamaModels, appSettings.googleApiKey, appSettings.openRouterApiKey, appSettings.huggingFaceApiKey]);


    const handleCodeGeneration = async () => {
        setIsLoading(true);
        setCode("// Initializing output buffer...");
        setPreviousCode(code);
        try {
            if (!selectedModelId) {
                throw new Error("No AI model selected. Please choose one from the settings.");
            }

            const output = await generateCodeFromPrompt({
                prompt: prompt,
                previousCode: previousCode || undefined,
                modelName: selectedModelId,
            });

            setCode(output.code);
            setPreviousCode(code);
            console.log("[page] Code generation completed successfully.");

            toast({
                title: "SYS: AI Generation OK",
                description: "Code generated successfully. Review and validate!",
                className: "font-mono border-primary text-primary",
            });

        } catch (error: any) {
            console.error("[page] Code generation failed:", error);
            setCode(`// AI generation failed. Please check console.\n// ${error.message}`);
            toast({
                variant: "destructive",
                title: "ERR: AI Generation Failed",
                description: error.message || "Failed to generate code. Check console.",
                className: "font-mono",
            });

        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = useCallback((editPrompt: string) => {
        setIsLoading(true);
        setIsEditPopupOpen(false);
        setCode("// Processing edit request...");

        generateCodeFromPrompt({
            prompt: editPrompt,
            previousCode: code || undefined,
            modelName: selectedModelId,
        }).then(output => {
            setCode(output.code);
            setPreviousCode(code);
            toast({
                title: "SYS: AI Edit OK",
                description: "Code edited successfully!",
                className: "font-mono border-primary text-primary",
            });
        }).catch((err: any) => {
            setCode(`// AI edit failed. Please check console.\n// ${err.message}`);
            toast({
                variant: "destructive",
                title: "ERR: AI Edit Failed",
                description: err.message || "AI edit failed.  Check console.",
                className: "font-mono",
            });
        }).finally(() => {
            setIsLoading(false);
        });

    }, [code, selectedModelId, toast]);

    const getProviderIcon = (provider: string): React.ReactNode => {
        const baseClasses = "h-4 w-4";
        switch (provider) {
            case 'Ollama': return <HardDrive className={cn(baseClasses, "text-secondary")} title="Ollama (Local)" />;
            case 'Google AI': return <BrainCircuit className={cn(baseClasses, "text-primary")} title="Google AI" />;
            case 'OpenRouter': return <CloudCog className={cn(baseClasses, "text-purple-400")} title="OpenRouter" />; // Style assumes available
            case 'Hugging Face': return <Binary className={cn(baseClasses, "text-yellow-400")} title="Hugging Face" />; // Use Binary icon
            default: return <Code className={baseClasses} />;
        }
    };

    return (
        <SidebarProvider>
            <Sidebar className="w-64">
                <SidebarHeader>
                    <div className="font-bold">
                        CodeSynth IDE
                    </div>
                </SidebarHeader>
                <SidebarInput placeholder="Search..." />
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <FileCode2 className="mr-2 h-4 w-4" />
                                <span>Code Editor</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <ListTree className="mr-2 h-4 w-4" />
                                <span>File Explorer</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <GitBranch className="mr-2 h-4 w-4" />
                                <span>Version Control</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <Terminal className="mr-2 h-4 w-4" />
                                <span>Terminal</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <Separator />
                    <SidebarGroup>
                        <SidebarGroupLabel>AI Features</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Code className="mr-2 h-4 w-4" />
                                    <span>Code Generation</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    <span>Validation Pipeline</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                    <span>AI Code Assistant</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Construction className="mr-2 h-4 w-4" />
                                    <span>AI Project Architect</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                    <Separator />
                    <SidebarGroup>
                        <SidebarGroupLabel>Firebase Integration</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    <span>One-Click Deployment</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Cloud className="mr-2 h-4 w-4" />
                                    <span>Hosting</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <TestTube2 className="mr-2 h-4 w-4" />
                                    <span>Functions</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    <span>Security Rules</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>Authentication</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <div className="flex flex-col items-center justify-center">
                        <Button variant="secondary" size="sm" onClick={() => setShowSettingsPanel(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="p-4 border-b-2 border-border flex items-center flex-shrink-0">
                    <Label htmlFor="model-select" className="text-sm font-mono mr-3">// Select AI Model:</Label>
                    <Select
                        id="model-select"
                        value={selectedModelId}
                        onValueChange={setSelectedModelId}
                        className="max-w-[200px]"
                    >
                        <SelectTrigger className="bg-input border-border rounded-none text-xs font-mono">
                            <SelectValue placeholder="Select Model..." />
                        </SelectTrigger>
                        <SelectContent className="font-mono text-xs rounded-none">
                            <SelectGroup>
                                <SelectLabel className="font-mono text-xs">Available Models</SelectLabel>
                                {allModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {getProviderIcon(model.provider)}
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="ml-2 hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed w-6 h-6 p-1 rounded-none border border-transparent hover:border-accent neon-glow">
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Refresh Model List
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </header>

                <main className="flex-grow flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
                    {/* Left Side: Prompt Input */}
                    <div className="lg:w-1/3 flex flex-col gap-4">
                        <PromptInput
                            prompt={prompt}
                            setPrompt={setPrompt}
                            onSubmit={handleCodeGeneration}
                            isLoading={isLoading}
                            placeholderText="// Describe application, file structure, features..."
                        />
                    </div>

                    <div className="hidden lg:block mx-2">
                        <Skeleton className="h-full w-px" />
                    </div>
                    <div className="lg:hidden my-2">
                        <Skeleton className="h-px w-full" />
                    </div>

                    {/* Right Side: Code Display */}
                    <div className="lg:w-2/3 flex-grow overflow-hidden">
                        <CodeDisplay
                            code={code}
                            title="// Generated_Code_Buffer //"
                            language="typescript"
                            isLoading={isLoading}
                        />
                        <div className="mt-2 flex justify-end">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsEditPopupOpen(true)}
                                disabled={isLoading || !code || code.startsWith('// AI')}
                                className="rounded-none"
                            >
                                Edit with Prompt
                            </Button>
                        </div>
                    </div>
                </main>

                {isEditPopupOpen && (
                    <EditPopup
                        initialCode={code || ""}
                        onSubmit={handleEdit}
                        onClose={() => setIsEditPopupOpen(false)}
                        isLoading={isLoading}
                        selectedModelId={selectedModelId}
                    />
                )}

                {showSettingsPanel && (
                    <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
                )}

                {/* Footer */}
                <footer className="pt-1 mt-auto border-t-2 border-border text-center text-xs text-muted-foreground font-mono flex-shrink-0">
                 [ CodeSynth IDE v0.7 | Active Providers: {getProviderNames(allModels, modelError)} | Status: {validationStatus} | &copy; {new Date().getFullYear()} ]
                </footer>
             </SidebarInset>
        </SidebarProvider>
    );
}
