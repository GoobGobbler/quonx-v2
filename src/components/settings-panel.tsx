
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, X, Palette, Cpu, Code, GitBranch, Cloud, Settings2, Save, Beaker } from 'lucide-react'; // Added Settings, Beaker
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from './ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

// Define the shape of our settings
interface AppSettings {
    ollamaBaseUrl: string;
    googleApiKey: string;
    openRouterApiKey: string;
    huggingFaceApiKey: string; // Keep field even if plugin not installed
    themePreset: string;
    font: string;
    enableScanlines: boolean;
    enableGrain: boolean;
    enableGlow: boolean;
    // New fields for future implementation
    modelTimeoutSeconds: number;
    maxOutputTokens: number;
    validationThreshold: number; // Example: 0-100 scale
    enableAnalytics: boolean; // Example for Experiments tab
}

// Default settings
const defaultSettings: AppSettings = {
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    googleApiKey: '',
    openRouterApiKey: '',
    huggingFaceApiKey: '', // Default to empty
    themePreset: 'Retro Terminal', // Default theme
    font: 'Cutive Mono', // Default font
    enableScanlines: true,
    enableGrain: true,
    enableGlow: true,
    modelTimeoutSeconds: 120, // Default timeout
    maxOutputTokens: 4096, // Default token limit
    validationThreshold: 80, // Default validation level
    enableAnalytics: false, // Default experiment setting
};

// Key for localStorage
const SETTINGS_STORAGE_KEY = 'codesynth_settings';

// Available Fonts (Example)
const availableFonts = [
    { value: 'Cutive Mono', label: 'Cutive Mono (Default)' },
    { value: 'Source Code Pro', label: 'Source Code Pro' },
    { value: 'VT323', label: 'VT323' },
    // Add more monospaced fonts here
];

// Available Themes (Example - needs actual implementation)
const availableThemes = [
    { value: 'Retro Terminal', label: 'Retro Terminal (Default)' },
    { value: 'Cyberpunk Night', label: 'Cyberpunk Night (Not Implemented)' },
    { value: '80s Matrix', label: '80s Matrix (Not Implemented)' },
];

interface SettingsPanelProps {
  onClose: () => void;
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
        // Merge defaults with stored settings to handle missing/new keys
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
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value, // Handle number conversion, allow empty string temp
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
        // Optional: Add validation before saving (e.g., ensure numbers are valid)
        if (isNaN(Number(settings.modelTimeoutSeconds)) || Number(settings.modelTimeoutSeconds) <= 0) {
           toast({ variant: "destructive", title: "Invalid Timeout", description: "Model timeout must be a positive number.", className: "font-mono" });
           return;
        }
        if (isNaN(Number(settings.maxOutputTokens)) || Number(settings.maxOutputTokens) <= 0) {
            toast({ variant: "destructive", title: "Invalid Token Limit", description: "Max output tokens must be a positive number.", className: "font-mono" });
            return;
        }
        // Add more validation as needed...

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        toast({
            title: "Settings Saved",
            description: "Configuration matrix updated successfully.",
            className: "font-mono border-primary text-primary",
        });
        onClose(); // Close after saving

        // Optional: Trigger a page reload or context update if settings affect global state immediately
        // This is often needed for theme/font changes to apply everywhere.
         window.location.reload();
    } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Settings",
            description: "Could not save settings to local storage.",
            className: "font-mono",
        });
    }
  };

  // Render skeleton or loading indicator while settings load
  if (isLoading) {
    return (
      <div className="popup-overlay">
        <div className="popup-content w-full max-w-2xl h-[80vh] flex items-center justify-center">
          <p className="text-muted-foreground font-mono animate-pulse">// Loading Configuration Matrix...</p>
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

        <h2 className="text-lg font-mono text-primary mb-3 border-b border-border pb-2 flex items-center">
           <Settings className="mr-2 h-5 w-5"/> // Configuration_Matrix //
        </h2>

        <Tabs defaultValue="appearance" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 gap-1 bg-transparent p-0 h-auto mb-3 rounded-none border-b border-border pb-2">
            <TabsTrigger value="appearance" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Palette className="h-3 w-3 mr-1 hidden md:inline"/>Appearance</TabsTrigger>
            <TabsTrigger value="ai-models" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cpu className="h-3 w-3 mr-1 hidden md:inline"/>AI Models</TabsTrigger>
            <TabsTrigger value="editor" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Code className="h-3 w-3 mr-1 hidden md:inline"/>Editor</TabsTrigger>
            <TabsTrigger value="git-repo" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><GitBranch className="h-3 w-3 mr-1 hidden md:inline"/>Version Control</TabsTrigger>
            <TabsTrigger value="deployments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cloud className="h-3 w-3 mr-1 hidden md:inline"/>Deployments</TabsTrigger>
            <TabsTrigger value="advanced" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Settings2 className="h-3 w-3 mr-1 hidden md:inline"/>Advanced</TabsTrigger>
             <TabsTrigger value="experiments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Beaker className="h-3 w-3 mr-1 hidden md:inline"/>Experiments</TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto pr-2 font-mono text-sm space-y-6"> {/* Added more spacing */}
             {/* Appearance Settings */}
             <TabsContent value="appearance" className="mt-0 space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="themePreset" className="font-mono text-sm text-secondary">// Theme Preset:</Label>
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
                     <p className="text-xs text-muted-foreground font-mono"> // Select the visual theme. Requires reload.</p>
                </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                    <Label htmlFor="font" className="font-mono text-sm text-secondary">// Editor Font:</Label>
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
                     <p className="text-xs text-muted-foreground font-mono"> // Select primary font for UI & editor. Requires reload.</p>
                 </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-2">
                     <Label className="font-mono text-sm text-secondary">// Visual Effects:</Label>
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
                      <p className="text-xs text-muted-foreground font-mono pt-1"> // Toggles visual effects. Requires reload.</p>
                 </div>
             </TabsContent>

             {/* AI Models Settings */}
             <TabsContent value="ai-models" className="mt-0 space-y-4">
                 <div className="space-y-1">
                     <Label htmlFor="ollamaBaseUrl" className="font-mono text-sm text-secondary">// Ollama Server Base URL:</Label>
                     <Input id="ollamaBaseUrl" name="ollamaBaseUrl" value={settings.ollamaBaseUrl} onChange={handleInputChange} placeholder="e.g., http://127.0.0.1:11434" className="bg-input border-border rounded-none text-xs font-mono"/>
                     <p className="text-xs text-muted-foreground font-mono"> // Endpoint for your local Ollama instance.</p>
                 </div>
                  <Separator className="bg-border/30"/>
                 <div className="space-y-3">
                    <Label className="font-mono text-sm text-secondary">// Cloud Provider API Keys:</Label>
                     <div className="space-y-1">
                         <Label htmlFor="googleApiKey" className="text-xs font-mono text-muted-foreground">// Google AI (Gemini) API Key:</Label>
                         <Input id="googleApiKey" name="googleApiKey" type="password" value={settings.googleApiKey} onChange={handleInputChange} placeholder="Enter Google API Key (starts with 'AIza...') " className="bg-input border-border rounded-none text-xs font-mono"/>
                     </div>
                      <div className="space-y-1">
                         <Label htmlFor="openRouterApiKey" className="text-xs font-mono text-muted-foreground">// OpenRouter API Key:</Label>
                         <Input id="openRouterApiKey" name="openRouterApiKey" type="password" value={settings.openRouterApiKey} onChange={handleInputChange} placeholder="Enter OpenRouter API Key (starts with 'sk-or-v1...')" className="bg-input border-border rounded-none text-xs font-mono"/>
                          <p className="text-xs text-destructive font-mono"> // Note: @genkit-ai/openrouter plugin currently unavailable.</p>
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="huggingFaceApiKey" className="text-xs font-mono text-muted-foreground">// Hugging Face API Key:</Label>
                         <Input id="huggingFaceApiKey" name="huggingFaceApiKey" type="password" value={settings.huggingFaceApiKey} onChange={handleInputChange} placeholder="Enter Hugging Face API Key (e.g., 'hf_...')" className="bg-input border-border rounded-none text-xs font-mono"/>
                         <p className="text-xs text-destructive font-mono"> // Note: @genkit-ai/huggingface plugin currently unavailable.</p>
                     </div>
                     <p className="text-xs text-destructive font-mono pt-1"> // WARNING: API keys stored insecurely in LocalStorage. Use environment variables (.env) for production deployment.</p>
                 </div>
                 <Separator className="bg-border/30"/>
                  <div className="space-y-3">
                     <Label className="font-mono text-sm text-secondary">// Model Configuration:</Label>
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
                      <p className="text-xs text-muted-foreground font-mono"> // Adjust AI model request parameters.</p>
                  </div>
             </TabsContent>

             {/* Editor Settings */}
            <TabsContent value="editor" className="mt-0 space-y-4">
                <Label className="font-mono text-sm text-secondary">// Editor Preferences:</Label>
                <p className="text-sm text-muted-foreground font-mono">// Editor settings not yet implemented (e.g., Tab Size, Auto Save, Keybindings, Monaco options).</p>
                {/* Placeholder for future settings */}
                <div className="space-y-1 opacity-50">
                   <Label htmlFor="tabSize" className="text-xs font-mono text-muted-foreground">// Tab Size:</Label>
                   <Input id="tabSize" name="tabSize" type="number" min="1" defaultValue="4" disabled className="bg-input border-border rounded-none text-xs font-mono"/>
                </div>
                 <div className="flex items-center space-x-2 opacity-50">
                     <Switch id="autoSave" name="autoSave" disabled />
                     <Label htmlFor="autoSave" className="text-xs font-mono">Enable Auto Save</Label>
                 </div>
             </TabsContent>

             {/* Version Control Settings */}
             <TabsContent value="git-repo" className="mt-0 space-y-4">
                 <Label className="font-mono text-sm text-secondary">// Version Control (Git):</Label>
                 <p className="text-sm text-muted-foreground font-mono">// Version Control integration not yet implemented (e.g., GitHub/GitLab PAT, Default Branch, Commit Signing).</p>
                  {/* Placeholder for future settings */}
                  <div className="space-y-1 opacity-50">
                     <Label htmlFor="githubPat" className="text-xs font-mono text-muted-foreground">// GitHub Personal Access Token:</Label>
                     <Input id="githubPat" name="githubPat" type="password" disabled placeholder="Enter GitHub PAT" className="bg-input border-border rounded-none text-xs font-mono"/>
                  </div>
                  <div className="space-y-1 opacity-50">
                     <Label htmlFor="defaultBranch" className="text-xs font-mono text-muted-foreground">// Default Branch Name:</Label>
                     <Input id="defaultBranch" name="defaultBranch" defaultValue="main" disabled className="bg-input border-border rounded-none text-xs font-mono"/>
                  </div>
             </TabsContent>

             {/* Deployments Settings */}
             <TabsContent value="deployments" className="mt-0 space-y-4">
                 <Label className="font-mono text-sm text-secondary">// Deployment Targets:</Label>
                 <p className="text-sm text-muted-foreground font-mono">// Deployment integration not yet implemented (e.g., Firebase Project ID, Cloud Run Region, Custom Webhook).</p>
                  {/* Placeholder for future settings */}
                  <div className="space-y-1 opacity-50">
                     <Label htmlFor="firebaseProjectId" className="text-xs font-mono text-muted-foreground">// Firebase Project ID:</Label>
                     <Input id="firebaseProjectId" name="firebaseProjectId" disabled placeholder="Enter Firebase Project ID" className="bg-input border-border rounded-none text-xs font-mono"/>
                  </div>
                   <div className="space-y-1 opacity-50">
                     <Label htmlFor="cloudRunRegion" className="text-xs font-mono text-muted-foreground">// Google Cloud Run Region:</Label>
                     <Input id="cloudRunRegion" name="cloudRunRegion" disabled placeholder="e.g., us-central1" className="bg-input border-border rounded-none text-xs font-mono"/>
                  </div>
             </TabsContent>

             {/* Advanced Settings */}
             <TabsContent value="advanced" className="mt-0 space-y-4">
                 <Label className="font-mono text-sm text-secondary">// Advanced Configuration:</Label>
                 <p className="text-sm text-muted-foreground font-mono">// Advanced settings not yet implemented (e.g., Validation Pipeline Config, Debug Levels, Custom Plugins).</p>
                  {/* Placeholder for future settings */}
                   <div className="space-y-1 opacity-50">
                     <Label htmlFor="validationThreshold" className="text-xs font-mono text-muted-foreground">// Validation Pipeline Sensitivity (0-100):</Label>
                     <Input id="validationThreshold" name="validationThreshold" type="number" min="0" max="100" value={settings.validationThreshold} onChange={handleInputChange} disabled className="bg-input border-border rounded-none text-xs font-mono"/>
                  </div>
                  <div className="space-y-1 opacity-50">
                     <Label htmlFor="debugLevel" className="text-xs font-mono text-muted-foreground">// Debug Log Level:</Label>
                      <Select name="debugLevel" defaultValue="info" disabled>
                         <SelectTrigger className="bg-input border-border rounded-none text-xs font-mono">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="font-mono text-xs rounded-none">
                             <SelectItem value="debug">Debug</SelectItem>
                             <SelectItem value="info">Info</SelectItem>
                             <SelectItem value="warn">Warning</SelectItem>
                             <SelectItem value="error">Error</SelectItem>
                         </SelectContent>
                      </Select>
                  </div>
            </TabsContent>

             {/* Experiments Settings */}
            <TabsContent value="experiments" className="mt-0 space-y-4">
               <Label className="font-mono text-sm text-secondary">// Experimental Features:</Label>
               <p className="text-sm text-muted-foreground font-mono">// Toggle experimental features. May require reload.</p>
                <div className="flex items-center space-x-2">
                     <Switch id="enableAnalytics" name="enableAnalytics" checked={settings.enableAnalytics} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableAnalytics')} />
                     <Label htmlFor="enableAnalytics" className="text-xs font-mono">Enable Usage Analytics (Conceptual)</Label>
                 </div>
                 {/* Add more experimental flags here */}
                 <div className="flex items-center space-x-2 opacity-50">
                     <Switch id="enableMultimodal" name="enableMultimodal" disabled />
                     <Label htmlFor="enableMultimodal" className="text-xs font-mono">Enable Multimodal Input (Not Implemented)</Label>
                 </div>
            </TabsContent>
           </div>
        </Tabs>

        <div className="mt-auto pt-4 border-t border-border flex justify-end gap-2 flex-shrink-0"> {/* Added mt-auto */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs rounded-none border border-muted text-muted-foreground hover:bg-muted/20 hover:text-foreground px-3 py-1.5"
          >
            Cancel_Cmd
          </Button>
          <Button
            onClick={handleSave}
            className="btn-neon-accent font-mono text-xs rounded-none px-4 py-1.5"
          >
            <Save className="mr-1 h-3 w-3" />
            Save_&_Reboot_Interface
          </Button>
        </div>
      </div>
    </div>
  );
}

    