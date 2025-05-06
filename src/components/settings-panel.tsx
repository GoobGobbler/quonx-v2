
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// Correctly import Settings icon
import { Settings as SettingsIcon, X, Palette, Cpu, Code, GitBranch, Cloud, Settings2, Save, Beaker, ShieldCheck, TestTubeDiagonal, Users, Construction, LayoutPanelLeft } from 'lucide-react'; // Renamed Settings to SettingsIcon
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from './ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton


// Define the shape of our settings (ensure consistency with page.tsx)
export interface AppSettings {
    ollamaBaseUrl: string;
    googleApiKey: string;
    openRouterApiKey: string;
    huggingFaceApiKey: string;
    themePreset: string;
    font: string;
    enableScanlines: boolean;
    enableGrain: boolean;
    enableGlow: boolean;
    // Advanced/Experimental Settings
    modelTimeoutSeconds: number;
    maxOutputTokens: number;
    validationThreshold: number; // Example: 0-100 scale
    enableAnalytics: boolean; // Example for Experiments tab
    // Conceptual fields for IDE/Plugin/Deployment features
    githubPat?: string; // Optional GitHub PAT
    gitlabToken?: string; // Optional GitLab Token
    defaultGitBranch?: string;
    enableCommitSigning?: boolean;
    firebaseProjectId?: string;
    cloudRunRegion?: string;
    deploymentWebhook?: string;
    editorTabSize?: number;
    editorAutoSave?: boolean;
    editorWordWrap?: boolean;
    editorKeybindings?: string;
    enableMultimodalInput?: boolean; // Experimental
    enableAgentCollaboration?: boolean; // Experimental
}

// Default settings (ensure consistency with page.tsx)
export const defaultSettings: AppSettings = {
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    googleApiKey: '',
    openRouterApiKey: '',
    huggingFaceApiKey: '',
    themePreset: 'Retro Terminal', // Default theme
    font: 'Cutive Mono', // Default font
    enableScanlines: true,
    enableGrain: true,
    enableGlow: true,
    modelTimeoutSeconds: 120, // Default timeout (2 minutes)
    maxOutputTokens: 4096, // Default token limit
    validationThreshold: 80, // Default validation level (conceptual)
    enableAnalytics: false, // Default experiment setting (conceptual)
    // Conceptual defaults
    githubPat: '',
    gitlabToken: '',
    defaultGitBranch: 'main',
    enableCommitSigning: false,
    firebaseProjectId: '',
    cloudRunRegion: '',
    deploymentWebhook: '',
    editorTabSize: 4,
    editorAutoSave: false,
    editorWordWrap: true,
    editorKeybindings: 'default',
    enableMultimodalInput: false,
    enableAgentCollaboration: false,
};

// Key for localStorage
export const SETTINGS_STORAGE_KEY = 'codesynth_settings';

// Available Fonts (Example)
const availableFonts = [
    { value: 'Cutive Mono', label: 'Cutive Mono (Default)' },
    { value: 'Source Code Pro', label: 'Source Code Pro' },
    { value: 'VT323', label: 'VT323' },
    // TODO: Add more monospaced fonts if needed
];

// Available Themes (Example - needs actual CSS implementation for themes beyond default)
const availableThemes = [
    { value: 'Retro Terminal', label: 'Retro Terminal (Default)' },
    { value: 'Cyberpunk Night', label: 'Cyberpunk Night (Not Implemented)' },
    { value: '80s Matrix', label: '80s Matrix (Not Implemented)' },
    // TODO: Add more theme options
];

// Editor Keybindings (Conceptual)
const editorKeybindingsOptions = [
    { value: 'default', label: 'Default' },
    { value: 'vim', label: 'Vim (Conceptual)' },
    { value: 'emacs', label: 'Emacs (Conceptual)' },
];


interface SettingsPanelProps {
  onClose: () => void; // Callback when panel is closed (usually involves refetching models)
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  // Load settings from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Merge defaults with stored settings to handle missing/new keys gracefully
        setSettings({ ...defaultSettings, ...parsedSettings });
      } else {
        setSettings(defaultSettings); // Use defaults if nothing stored
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setSettings(defaultSettings); // Fallback to defaults on error
      toast({
        variant: "destructive",
        title: "Error Loading Settings",
        description: "Could not load saved settings. Using defaults.",
        className: "font-mono",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Handle input changes (covers text, number, password)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    // Use 'valueAsNumber' for number inputs, fall back to empty string if NaN
    const newValue = type === 'number'
        ? (isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)
        : value;

    setSettings(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // Handle Select changes
  const handleSelectChange = (value: string, name: keyof AppSettings) => {
     setSettings(prev => ({
       ...prev,
       [name]: value,
     }));
   };

  // Handle switch changes
  const handleSwitchChange = (checked: boolean, name: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [name]: checked,
    }));
  };


  // Save settings to localStorage
  const handleSave = () => {
    try {
        // --- Validation ---
        if (!settings.ollamaBaseUrl || !settings.ollamaBaseUrl.startsWith('http')) {
             toast({ variant: "destructive", title: "Invalid Ollama URL", description: "Ollama Base URL must be a valid http/https URL.", className: "font-mono" });
             return;
        }
         // Validate number fields more carefully, allowing empty string but not invalid numbers
         if (settings.modelTimeoutSeconds !== '' && (isNaN(Number(settings.modelTimeoutSeconds)) || Number(settings.modelTimeoutSeconds) <= 0)) {
            toast({ variant: "destructive", title: "Invalid Timeout", description: "Model timeout must be a positive number.", className: "font-mono" });
            return;
         }
         if (settings.maxOutputTokens !== '' && (isNaN(Number(settings.maxOutputTokens)) || Number(settings.maxOutputTokens) <= 0)) {
             toast({ variant: "destructive", title: "Invalid Token Limit", description: "Max output tokens must be a positive number.", className: "font-mono" });
             return;
         }
          if (settings.validationThreshold !== '' && (isNaN(Number(settings.validationThreshold)) || Number(settings.validationThreshold) < 0 || Number(settings.validationThreshold) > 100)) {
             toast({ variant: "destructive", title: "Invalid Validation Threshold", description: "Threshold must be between 0 and 100.", className: "font-mono" });
             return;
         }
         if (settings.editorTabSize !== '' && (isNaN(Number(settings.editorTabSize)) || Number(settings.editorTabSize) < 1)) {
             toast({ variant: "destructive", title: "Invalid Tab Size", description: "Tab Size must be a positive number.", className: "font-mono" });
             return;
         }
        // Add more validation as needed...

        // --- Save ---
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        toast({
            title: "Settings Saved",
            description: "Configuration matrix updated. Manual reload may be needed for theme/font.",
            className: "font-mono border-primary text-primary",
        });
        onClose(); // Close panel and trigger model refresh in parent via the onClose callback

        // Optional: Trigger a page reload if settings require it (e.g., theme/font)
        // Consider making this conditional based on which settings changed.
        // window.location.reload();
    } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Settings",
            description: `Could not save settings. ${error instanceof Error ? error.message : 'Unknown error.'}`,
            className: "font-mono",
        });
    }
  };

  // Render skeleton or loading indicator while settings load
  if (isLoading) {
    return (
      <div className="popup-overlay">
        <div className="popup-content w-full max-w-3xl h-[85vh] flex items-center justify-center">
           {/* Use Skeleton components for a better loading state */}
            <div className="space-y-4 w-full p-6">
               <Skeleton className="h-8 w-1/3" />
               <Skeleton className="h-6 w-full" />
               <div className="grid grid-cols-3 gap-4">
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
               </div>
                <Skeleton className="h-40 w-full" />
                 <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                 </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-overlay">
      <div className="popup-content w-full max-w-3xl h-[85vh] flex flex-col"> {/* Increased size slightly */}
        <button
          onClick={onClose}
          className="popup-close-button"
          aria-label="Close settings panel"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="text-lg font-mono text-primary mb-3 border-b border-border pb-2 flex items-center flex-shrink-0">
           <SettingsIcon className="mr-2 h-5 w-5"/> // Configuration_Matrix // {/* Use renamed SettingsIcon */}
        </h2>

        {/* Tabs */}
        <Tabs defaultValue="appearance" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 gap-1 bg-transparent p-0 h-auto mb-3 rounded-none border-b border-border pb-2 flex-shrink-0">
            {/* Use consistent icons and labels */}
            <TabsTrigger value="appearance" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Palette className="h-3 w-3 mr-1 hidden md:inline"/>Appearance</TabsTrigger>
            <TabsTrigger value="ai-models" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cpu className="h-3 w-3 mr-1 hidden md:inline"/>AI Models</TabsTrigger>
            <TabsTrigger value="editor" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Code className="h-3 w-3 mr-1 hidden md:inline"/>Editor</TabsTrigger>
            <TabsTrigger value="version-control" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><GitBranch className="h-3 w-3 mr-1 hidden md:inline"/>Version Control</TabsTrigger>
            <TabsTrigger value="deployments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cloud className="h-3 w-3 mr-1 hidden md:inline"/>Deployments</TabsTrigger>
            <TabsTrigger value="advanced" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Settings2 className="h-3 w-3 mr-1 hidden md:inline"/>Advanced</TabsTrigger>
             <TabsTrigger value="experiments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Beaker className="h-3 w-3 mr-1 hidden md:inline"/>Experiments</TabsTrigger>
          </TabsList>

          {/* Tab Content Area */}
          <div className="flex-grow overflow-y-auto pr-2 font-mono text-sm space-y-6 pl-1"> {/* Added pl-1 for consistency */}

             {/* --- Appearance Settings --- */}
             <TabsContent value="appearance" className="mt-0 space-y-4">
                <h3 className="font-semibold text-secondary">// Visual & Font Configuration</h3>
                <div className="space-y-1">
                    <Label htmlFor="themePreset" className="font-mono text-sm text-muted-foreground">// Theme Preset:</Label>
                    <Select name="themePreset" value={settings.themePreset} onValueChange={(value) => handleSelectChange(value, 'themePreset')}>
                      <SelectTrigger className="bg-input border-border rounded-none text-xs font-mono">
                        <SelectValue placeholder="Select Theme..." />
                      </SelectTrigger>
                      <SelectContent className="font-mono text-xs rounded-none">
                        <SelectGroup>
                           <SelectLabel className="font-mono text-xs">Available Themes</SelectLabel>
                           {availableThemes.map((theme) => (
                               <SelectItem key={theme.value} value={theme.value} disabled={theme.label.includes('Not Implemented')}>
                                   {theme.label}
                               </SelectItem>
                           ))}
                         </SelectGroup>
                      </SelectContent>
                    </Select>
                     <p className="text-xs text-muted-foreground font-mono"> // Select the visual theme. Requires manual reload after save.</p>
                </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                    <Label htmlFor="font" className="font-mono text-sm text-muted-foreground">// Editor Font:</Label>
                    <Select name="font" value={settings.font} onValueChange={(value) => handleSelectChange(value, 'font')}>
                         <SelectTrigger className="bg-input border-border rounded-none text-xs font-mono">
                             <SelectValue placeholder="Select Font..." />
                         </SelectTrigger>
                         <SelectContent className="font-mono text-xs rounded-none">
                            <SelectGroup>
                                <SelectLabel className="font-mono text-xs">Available Fonts</SelectLabel>
                                {availableFonts.map((font) => (
                                   <SelectItem key={font.value} value={font.value}>
                                       {font.label}
                                   </SelectItem>
                               ))}
                            </SelectGroup>
                         </SelectContent>
                    </Select>
                     <p className="text-xs text-muted-foreground font-mono"> // Select primary font for UI & editor. Requires manual reload after save.</p>
                 </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-2">
                     <Label className="font-mono text-sm text-muted-foreground">// Visual Effects:</Label>
                     <div className="flex items-center space-x-2">
                         <Switch id="enableScanlines" name="enableScanlines" checked={settings.enableScanlines} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableScanlines')} />
                         <Label htmlFor="enableScanlines" className="text-xs font-mono">Enable CRT Scanlines</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                         <Switch id="enableGrain" name="enableGrain" checked={settings.enableGrain} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableGrain')} />
                         <Label htmlFor="enableGrain" className="text-xs font-mono">Enable Film Grain Texture</Label>
                     </div>
                      <div className="flex items-center space-x-2">
                         <Switch id="enableGlow" name="enableGlow" checked={settings.enableGlow} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableGlow')} />
                         <Label htmlFor="enableGlow" className="text-xs font-mono">Enable Neon Glow Effects</Label>
                     </div>
                      <p className="text-xs text-muted-foreground font-mono pt-1"> // Toggles visual effects. Requires manual reload after save.</p>
                 </div>
             </TabsContent>

             {/* --- AI Models Settings --- */}
             <TabsContent value="ai-models" className="mt-0 space-y-4">
                 <h3 className="font-semibold text-secondary">// Model Providers & Parameters</h3>
                 {/* Ollama Settings */}
                 <div className="space-y-1 p-3 border border-dashed border-secondary/30 rounded-sm">
                     <Label htmlFor="ollamaBaseUrl" className="font-mono text-sm text-secondary flex items-center"><Cpu className="h-4 w-4 mr-1"/> Ollama Server Base URL:</Label>
                     <Input id="ollamaBaseUrl" name="ollamaBaseUrl" value={settings.ollamaBaseUrl} onChange={handleInputChange} placeholder="e.g., http://127.0.0.1:11434" className="bg-input border-border rounded-none text-xs font-mono"/>
                     <p className="text-xs text-muted-foreground font-mono"> // Endpoint for your local Ollama instance. Needs to be accessible from your browser.</p>
                 </div>
                  <Separator className="bg-border/30"/>
                 {/* Cloud API Keys */}
                 <div className="space-y-3 p-3 border border-dashed border-primary/30 rounded-sm">
                    <Label className="font-mono text-sm text-primary">// Cloud Provider API Keys:</Label>
                     <div className="space-y-1">
                         <Label htmlFor="googleApiKey" className="text-xs font-mono text-muted-foreground">// Google AI (Gemini) API Key:</Label>
                         <Input id="googleApiKey" name="googleApiKey" type="password" value={settings.googleApiKey} onChange={handleInputChange} placeholder="Enter Google API Key (starts with 'AIza...') " className="bg-input border-border rounded-none text-xs font-mono"/>
                     </div>
                      <div className="space-y-1">
                         <Label htmlFor="openRouterApiKey" className="text-xs font-mono text-muted-foreground">// OpenRouter API Key:</Label>
                         <Input id="openRouterApiKey" name="openRouterApiKey" type="password" value={settings.openRouterApiKey} onChange={handleInputChange} placeholder="Enter OpenRouter API Key (starts with 'sk-or-v1...')" className="bg-input border-border rounded-none text-xs font-mono"/>
                          <p className="text-xs text-destructive font-mono"> // Note: @genkit-ai/openrouter plugin@1.8.0 currently unavailable.</p>
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="huggingFaceApiKey" className="text-xs font-mono text-muted-foreground">// Hugging Face API Key:</Label>
                         <Input id="huggingFaceApiKey" name="huggingFaceApiKey" type="password" value={settings.huggingFaceApiKey} onChange={handleInputChange} placeholder="Enter Hugging Face API Key (e.g., 'hf_...')" className="bg-input border-border rounded-none text-xs font-mono"/>
                         <p className="text-xs text-destructive font-mono"> // Note: @genkit-ai/huggingface plugin@1.8.0 currently unavailable.</p>
                     </div>
                     <p className="text-xs text-destructive font-mono pt-1"> // WARNING: API keys are stored insecurely in LocalStorage. Suitable for local development only. Use environment variables for production.</p>
                 </div>
                 <Separator className="bg-border/30"/>
                 {/* Model Parameters */}
                  <div className="space-y-3 p-3 border border-dashed border-muted/30 rounded-sm">
                     <Label className="font-mono text-sm text-muted">// Model Configuration:</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <Label htmlFor="modelTimeoutSeconds" className="text-xs font-mono text-muted-foreground">// Request Timeout (seconds):</Label>
                              <Input id="modelTimeoutSeconds" name="modelTimeoutSeconds" type="number" min="1" value={settings.modelTimeoutSeconds} onChange={handleInputChange} placeholder="e.g., 120" className="bg-input border-border rounded-none text-xs font-mono"/>
                          </div>
                          <div className="space-y-1">
                             <Label htmlFor="maxOutputTokens" className="text-xs font-mono text-muted-foreground">// Max Output Tokens:</Label>
                             <Input id="maxOutputTokens" name="maxOutputTokens" type="number" min="1" value={settings.maxOutputTokens} onChange={handleInputChange} placeholder="e.g., 4096" className="bg-input border-border rounded-none text-xs font-mono"/>
                          </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono"> // Adjust AI model request parameters (applied where supported by the model/API).</p>
                  </div>
             </TabsContent>

             {/* --- Editor Settings --- */}
            <TabsContent value="editor" className="mt-0 space-y-4">
                 <h3 className="font-semibold text-secondary">// Editor Preferences</h3>
                 {/* <p className="text-sm text-muted-foreground font-mono">// These settings are placeholders and not yet functional.</p> */}
                 <div className="space-y-1">
                    <Label htmlFor="editorTabSize" className="text-xs font-mono text-muted-foreground">// Tab Size:</Label>
                    <Input id="editorTabSize" name="editorTabSize" type="number" min="1" value={settings.editorTabSize ?? ''} onChange={handleInputChange} className="bg-input border-border rounded-none text-xs font-mono"/>
                 </div>
                  <div className="flex items-center space-x-2">
                      <Switch id="editorAutoSave" name="editorAutoSave" checked={settings.editorAutoSave ?? false} onCheckedChange={(checked) => handleSwitchChange(checked, 'editorAutoSave')} />
                      <Label htmlFor="editorAutoSave" className="text-xs font-mono">Enable Auto Save (Conceptual)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Switch id="editorWordWrap" name="editorWordWrap" checked={settings.editorWordWrap ?? true} onCheckedChange={(checked) => handleSwitchChange(checked, 'editorWordWrap')} />
                      <Label htmlFor="editorWordWrap" className="text-xs font-mono">Enable Word Wrap (Conceptual)</Label>
                  </div>
                  <div className="space-y-1">
                     <Label htmlFor="editorKeybindings" className="text-xs font-mono text-muted-foreground">// Keybindings:</Label>
                       <Select name="editorKeybindings" value={settings.editorKeybindings ?? 'default'} onValueChange={(value) => handleSelectChange(value, 'editorKeybindings')}>
                          <SelectTrigger className="bg-input border-border rounded-none text-xs font-mono">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="font-mono text-xs rounded-none">
                             <SelectGroup>
                                <SelectLabel className="font-mono text-xs">Keybinding Presets</SelectLabel>
                                {editorKeybindingsOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} disabled={opt.label.includes('Conceptual')}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                              </SelectGroup>
                          </SelectContent>
                       </Select>
                   </div>
             </TabsContent>

             {/* --- Version Control Settings --- */}
             <TabsContent value="version-control" className="mt-0 space-y-4">
                  <h3 className="font-semibold text-secondary">// Version Control (Git)</h3>
                  {/* <p className="text-sm text-muted-foreground font-mono">// Git integration is not yet implemented.</p> */}
                   <div className="space-y-1">
                      <Label htmlFor="githubPat" className="text-xs font-mono text-muted-foreground">// GitHub Personal Access Token:</Label>
                      <Input id="githubPat" name="githubPat" type="password" value={settings.githubPat ?? ''} onChange={handleInputChange} placeholder="Enter GitHub PAT" className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                   <div className="space-y-1">
                      <Label htmlFor="gitlabToken" className="text-xs font-mono text-muted-foreground">// GitLab Personal Access Token:</Label>
                      <Input id="gitlabToken" name="gitlabToken" type="password" value={settings.gitlabToken ?? ''} onChange={handleInputChange} placeholder="Enter GitLab PAT" className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                   <div className="space-y-1">
                      <Label htmlFor="defaultGitBranch" className="text-xs font-mono text-muted-foreground">// Default Branch Name:</Label>
                      <Input id="defaultGitBranch" name="defaultGitBranch" value={settings.defaultGitBranch ?? 'main'} onChange={handleInputChange} className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                   <div className="flex items-center space-x-2">
                      <Switch id="enableCommitSigning" name="enableCommitSigning" checked={settings.enableCommitSigning ?? false} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableCommitSigning')} />
                      <Label htmlFor="enableCommitSigning" className="text-xs font-mono">Enable Commit Signing (GPG - Conceptual)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono pt-1"> // Configure Git provider tokens and preferences (integration conceptual).</p>
             </TabsContent>

             {/* --- Deployments Settings --- */}
             <TabsContent value="deployments" className="mt-0 space-y-4">
                  <h3 className="font-semibold text-secondary">// Deployment Targets</h3>
                  {/* <p className="text-sm text-muted-foreground font-mono">// Deployment integration (Firebase, Cloud Run) is not yet implemented.</p> */}
                   <div className="space-y-1">
                      <Label htmlFor="firebaseProjectId" className="text-xs font-mono text-muted-foreground">// Firebase Project ID:</Label>
                      <Input id="firebaseProjectId" name="firebaseProjectId" value={settings.firebaseProjectId ?? ''} onChange={handleInputChange} placeholder="Enter Firebase Project ID" className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                    <div className="space-y-1">
                      <Label htmlFor="cloudRunRegion" className="text-xs font-mono text-muted-foreground">// Google Cloud Run Region:</Label>
                      <Input id="cloudRunRegion" name="cloudRunRegion" value={settings.cloudRunRegion ?? ''} onChange={handleInputChange} placeholder="e.g., us-central1" className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                    <div className="space-y-1">
                      <Label htmlFor="deploymentWebhook" className="text-xs font-mono text-muted-foreground">// Custom Deployment Webhook URL:</Label>
                      <Input id="deploymentWebhook" name="deploymentWebhook" type="url" value={settings.deploymentWebhook ?? ''} onChange={handleInputChange} placeholder="Enter Webhook URL" className="bg-input border-border rounded-none text-xs font-mono"/>
                   </div>
                   <p className="text-xs text-muted-foreground font-mono pt-1"> // Configure targets for one-click deployments (integration conceptual).</p>
             </TabsContent>

             {/* --- Advanced Settings --- */}
             <TabsContent value="advanced" className="mt-0 space-y-4">
                  <h3 className="font-semibold text-secondary">// Advanced Configuration</h3>
                  {/* <p className="text-sm text-muted-foreground font-mono">// Advanced settings (validation pipeline, plugins) are not yet implemented.</p> */}
                    <div className="space-y-1">
                      <Label htmlFor="validationThreshold" className="text-xs font-mono text-muted-foreground">// Validation Pipeline Sensitivity (0-100):</Label>
                      <Input id="validationThreshold" name="validationThreshold" type="number" min="0" max="100" value={settings.validationThreshold} onChange={handleInputChange} placeholder="80" className="bg-input border-border rounded-none text-xs font-mono"/>
                      <p className="text-xs text-muted-foreground font-mono">// Controls strictness of the pre-apply validation (conceptual).</p>
                   </div>
                   <Separator className="bg-border/30"/>
                   <div className="space-y-1 opacity-50">
                       <Label className="font-mono text-sm text-muted">// Plugin Management:</Label>
                       <p className="text-xs text-muted-foreground"> // List installed plugins and enable/disable (Not Implemented).</p>
                       <div className="p-2 border rounded-sm bg-input h-24 overflow-y-auto">
                            <p className="text-xs">[x] Language Support: TypeScript</p>
                            <p className="text-xs">[x] Linter: ESLint (Default)</p>
                            <p className="text-xs">[ ] Theme: Cyberpunk Night</p>
                       </div>
                   </div>
             </TabsContent>

             {/* --- Experiments Settings --- */}
            <TabsContent value="experiments" className="mt-0 space-y-4">
                <h3 className="font-semibold text-secondary">// Experimental Features</h3>
                <p className="text-sm text-muted-foreground font-mono">// Toggle experimental or unstable features. Use with caution.</p>
                 <div className="flex items-center space-x-2">
                      <Switch id="enableAnalytics" name="enableAnalytics" checked={settings.enableAnalytics} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableAnalytics')} />
                      <Label htmlFor="enableAnalytics" className="text-xs font-mono">Enable Usage Analytics (Conceptual)</Label>
                  </div>
                  <Separator className="bg-border/30"/>
                  {/* Add more experimental flags here */}
                  <div className="flex items-center space-x-2">
                      <Switch id="enableMultimodalInput" name="enableMultimodalInput" checked={settings.enableMultimodalInput ?? false} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableMultimodalInput')}/>
                      <Label htmlFor="enableMultimodalInput" className="text-xs font-mono">Enable Multimodal Input (Vision/Audio - Conceptual)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Switch id="enableAgentCollaboration" name="enableAgentCollaboration" checked={settings.enableAgentCollaboration ?? false} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableAgentCollaboration')} />
                      <Label htmlFor="enableAgentCollaboration" className="text-xs font-mono">Enable AI Agent Collaboration (Conceptual)</Label>
                  </div>
            </TabsContent>
           </div>
        </Tabs>

        {/* Footer/Actions */}
        <div className="mt-auto pt-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs rounded-none border border-muted text-muted-foreground hover:bg-muted/20 hover:text-foreground px-3 py-1.5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="btn-neon-accent font-mono text-xs rounded-none px-4 py-1.5"
          >
            <Save className="mr-1 h-3 w-3" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
