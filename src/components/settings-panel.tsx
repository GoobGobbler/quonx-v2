
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input
import { X, Palette, Cpu, Code, GitBranch, Cloud, Settings2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from './ui/separator';
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Switch } from '@/components/ui/switch'; // Import Switch

// Define the shape of our settings
interface AppSettings {
    ollamaBaseUrl: string;
    googleApiKey: string;
    openRouterApiKey: string;
    // huggingFaceApiKey: string; // Keep commented out as package not found
    themePreset: string;
    font: string;
    enableScanlines: boolean;
    enableGrain: boolean;
    enableGlow: boolean;
    // Add other settings as needed
}

// Default settings
const defaultSettings: AppSettings = {
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    googleApiKey: '',
    openRouterApiKey: '',
    // huggingFaceApiKey: '',
    themePreset: 'Retro Terminal',
    font: 'Cutive Mono',
    enableScanlines: true,
    enableGrain: true,
    enableGlow: true,
};

// Key for localStorage
const SETTINGS_STORAGE_KEY = 'codesynth_settings';

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
        // Merge defaults with stored settings to handle missing keys
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

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
        // TODO: Add validation before saving if needed
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        toast({
            title: "Settings Saved",
            description: "Configuration matrix updated successfully.",
            className: "font-mono border-primary text-primary",
        });
        onClose(); // Close after saving

        // Optional: Trigger a page reload or context update if settings affect global state immediately
        // window.location.reload();
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
          <p className="text-muted-foreground font-mono animate-pulse">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-overlay">
      <div className="popup-content w-full max-w-2xl h-[80vh] flex flex-col">
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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 bg-transparent p-0 h-auto mb-3 rounded-none border-b border-border pb-2">
            <TabsTrigger value="appearance" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Palette className="h-3 w-3 mr-1 hidden md:inline"/>Appearance</TabsTrigger>
            <TabsTrigger value="ai-models" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cpu className="h-3 w-3 mr-1 hidden md:inline"/>AI Models</TabsTrigger>
            <TabsTrigger value="editor" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Code className="h-3 w-3 mr-1 hidden md:inline"/>Editor</TabsTrigger>
            <TabsTrigger value="git-repo" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><GitBranch className="h-3 w-3 mr-1 hidden md:inline"/>Git & Repo</TabsTrigger>
            <TabsTrigger value="deployments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cloud className="h-3 w-3 mr-1 hidden md:inline"/>Deployments</TabsTrigger>
            <TabsTrigger value="advanced" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Settings2 className="h-3 w-3 mr-1 hidden md:inline"/>Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto pr-2 font-mono text-sm">
             {/* Appearance Settings */}
             <TabsContent value="appearance" className="mt-0 space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="themePreset" className="font-mono text-sm text-secondary">// Theme Preset:</Label>
                    <p className="text-xs text-muted-foreground font-mono">Theme selection not implemented yet.</p>
                    {/* TODO: Add Select component for theme presets */}
                     <Input id="themePreset" name="themePreset" value={settings.themePreset} onChange={handleInputChange} className="bg-input border-border rounded-none text-xs font-mono" disabled placeholder="Theme selection not implemented"/>
                </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                    <Label htmlFor="font" className="font-mono text-sm text-secondary">// Font:</Label>
                    <p className="text-xs text-muted-foreground font-mono">Font selection not implemented yet.</p>
                    {/* TODO: Add Select component for fonts */}
                    <Input id="font" name="font" value={settings.font} onChange={handleInputChange} className="bg-input border-border rounded-none text-xs font-mono" disabled placeholder="Font selection not implemented"/>
                 </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-2">
                     <Label className="font-mono text-sm text-secondary">// Animations & Effects:</Label>
                     <div className="flex items-center space-x-2">
                         <Switch id="enableScanlines" name="enableScanlines" checked={settings.enableScanlines} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableScanlines')} />
                         <Label htmlFor="enableScanlines" className="text-xs font-mono">Enable Scanlines</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                         <Switch id="enableGrain" name="enableGrain" checked={settings.enableGrain} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableGrain')} />
                         <Label htmlFor="enableGrain" className="text-xs font-mono">Enable Grain Texture</Label>
                     </div>
                      <div className="flex items-center space-x-2">
                         <Switch id="enableGlow" name="enableGlow" checked={settings.enableGlow} onCheckedChange={(checked) => handleSwitchChange(checked, 'enableGlow')} />
                         <Label htmlFor="enableGlow" className="text-xs font-mono">Enable Neon Glow Effects</Label>
                     </div>
                      <p className="text-xs text-muted-foreground font-mono pt-1"> // Requires page reload to apply some visual changes.</p>
                 </div>
             </TabsContent>

             {/* AI Models Settings */}
             <TabsContent value="ai-models" className="mt-0 space-y-4">
                 <div className="space-y-1">
                     <Label htmlFor="ollamaBaseUrl" className="font-mono text-sm text-secondary">// Ollama Base URL:</Label>
                     <Input id="ollamaBaseUrl" name="ollamaBaseUrl" value={settings.ollamaBaseUrl} onChange={handleInputChange} placeholder="e.g., http://127.0.0.1:11434" className="bg-input border-border rounded-none text-xs font-mono"/>
                     <p className="text-xs text-muted-foreground font-mono"> // Default URL for local Ollama server.</p>
                 </div>
                  <Separator className="bg-border/30"/>
                 <div className="space-y-3">
                    <Label className="font-mono text-sm text-secondary">// API Keys (Stored in LocalStorage - Use Environment Variables for Production):</Label>
                     <div className="space-y-1">
                         <Label htmlFor="googleApiKey" className="text-xs font-mono text-muted-foreground">// Google AI (Gemini) API Key:</Label>
                         <Input id="googleApiKey" name="googleApiKey" type="password" value={settings.googleApiKey} onChange={handleInputChange} placeholder="Enter Google API Key" className="bg-input border-border rounded-none text-xs font-mono"/>
                     </div>
                      <div className="space-y-1">
                         <Label htmlFor="openRouterApiKey" className="text-xs font-mono text-muted-foreground">// OpenRouter API Key:</Label>
                         <Input id="openRouterApiKey" name="openRouterApiKey" type="password" value={settings.openRouterApiKey} onChange={handleInputChange} placeholder="Enter OpenRouter API Key" className="bg-input border-border rounded-none text-xs font-mono"/>
                     </div>
                     {/* <div className="space-y-1">
                         <Label htmlFor="huggingFaceApiKey" className="text-xs font-mono text-muted-foreground">// Hugging Face API Key:</Label>
                         <Input id="huggingFaceApiKey" name="huggingFaceApiKey" type="password" value={settings.huggingFaceApiKey} onChange={handleInputChange} placeholder="Enter Hugging Face API Key" className="bg-input border-border rounded-none text-xs font-mono"/>
                     </div> */}
                     <p className="text-xs text-destructive font-mono pt-1"> // Warning: Storing keys in localStorage is insecure for production. Use environment variables (.env) instead.</p>

                 </div>
                 <Separator className="bg-border/30"/>
                  <div className="space-y-1">
                     <Label className="font-mono text-sm text-secondary">// Timeouts & Token Limits:</Label>
                      <p className="text-xs text-muted-foreground font-mono">Configuration not yet implemented.</p>
                      {/* TODO: Add Input components (type="number") here */}
                  </div>
             </TabsContent>

             {/* Editor Settings */}
            <TabsContent value="editor" className="mt-0">
                <p className="text-sm text-muted-foreground font-mono">// Editor settings placeholder (e.g., Tab Size, Auto Save, Monaco options)</p>
             </TabsContent>

             {/* Git & Repo Settings */}
             <TabsContent value="git-repo" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Git settings placeholder (e.g., GitHub/GitLab PAT, Default Branch)</p>
             </TabsContent>

             {/* Deployments Settings */}
             <TabsContent value="deployments" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Deployment settings placeholder (e.g., Firebase Project ID, Cloud Run Region)</p>
             </TabsContent>

             {/* Advanced Settings */}
             <TabsContent value="advanced" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Advanced settings placeholder (e.g., Validation Pipeline Config, Debug Mode)</p>
            </TabsContent>
           </div>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs rounded-none border border-muted text-muted-foreground hover:bg-muted/20 hover:text-foreground px-3 py-1.5"
          >
            Cancel_Changes
          </Button>
          <Button
            onClick={handleSave}
            className="btn-neon-accent font-mono text-xs rounded-none px-4 py-1.5"
          >
            <Save className="mr-1 h-3 w-3" />
            Save_&_Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
