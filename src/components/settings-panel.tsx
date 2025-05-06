'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Palette, Cpu, Code, GitBranch, Cloud, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from './ui/separator';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  // Placeholder state and handlers - replace with actual logic
  const handleSave = () => {
    console.log('Saving settings...');
    onClose(); // Close after saving
  };

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
            {/* Use icons for smaller screens if needed */}
            <TabsTrigger value="appearance" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Palette className="h-3 w-3 mr-1 hidden md:inline"/>Appearance</TabsTrigger>
            <TabsTrigger value="ai-models" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cpu className="h-3 w-3 mr-1 hidden md:inline"/>AI Models</TabsTrigger>
            <TabsTrigger value="editor" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Code className="h-3 w-3 mr-1 hidden md:inline"/>Editor</TabsTrigger>
            <TabsTrigger value="git-repo" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><GitBranch className="h-3 w-3 mr-1 hidden md:inline"/>Git & Repo</TabsTrigger>
            <TabsTrigger value="deployments" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Cloud className="h-3 w-3 mr-1 hidden md:inline"/>Deployments</TabsTrigger>
            <TabsTrigger value="advanced" className="font-mono text-xs rounded-none data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:shadow-none"><Settings2 className="h-3 w-3 mr-1 hidden md:inline"/>Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto pr-2">
             {/* Appearance Settings */}
             <TabsContent value="appearance" className="mt-0 space-y-4">
                <div className="space-y-1">
                    <Label className="font-mono text-sm text-secondary">// Theme Preset:</Label>
                    <p className="text-xs text-muted-foreground font-mono">Retro Terminal (Default)</p>
                    {/* Add Select component here */}
                </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                    <Label className="font-mono text-sm text-secondary">// Font:</Label>
                     <p className="text-xs text-muted-foreground font-mono">Cutive Mono (Default)</p>
                     {/* Add Select component here */}
                 </div>
                 <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                     <Label className="font-mono text-sm text-secondary">// Animations & Effects:</Label>
                     <p className="text-xs text-muted-foreground font-mono">Enabled (Default)</p>
                     {/* Add Switch components here for Scanlines, Grain, Glow etc. */}
                 </div>
             </TabsContent>

             {/* AI Models Settings */}
             <TabsContent value="ai-models" className="mt-0 space-y-4">
                 <div className="space-y-1">
                     <Label className="font-mono text-sm text-secondary">// Ollama Base URL:</Label>
                      <p className="text-xs text-muted-foreground font-mono">http://127.0.0.1:11434 (Default)</p>
                      {/* Add Input component here */}
                 </div>
                  <Separator className="bg-border/30"/>
                 <div className="space-y-1">
                    <Label className="font-mono text-sm text-secondary">// API Keys:</Label>
                     <p className="text-xs text-muted-foreground font-mono">Enter keys for Google AI, OpenRouter, Hugging Face</p>
                     {/* Add Input components (type="password") here */}
                 </div>
                 <Separator className="bg-border/30"/>
                  <div className="space-y-1">
                     <Label className="font-mono text-sm text-secondary">// Timeouts & Token Limits:</Label>
                      <p className="text-xs text-muted-foreground font-mono">Default values</p>
                      {/* Add Input components (type="number") here */}
                  </div>
             </TabsContent>

             {/* Editor Settings */}
            <TabsContent value="editor" className="mt-0">
                <p className="text-sm text-muted-foreground font-mono">// Editor settings placeholder (e.g., Tab Size, Auto Save)</p>
             </TabsContent>

             {/* Git & Repo Settings */}
             <TabsContent value="git-repo" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Git settings placeholder (e.g., GitHub/GitLab PAT)</p>
             </TabsContent>

             {/* Deployments Settings */}
             <TabsContent value="deployments" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Deployment settings placeholder (e.g., Firebase Project ID)</p>
             </TabsContent>

             {/* Advanced Settings */}
             <TabsContent value="advanced" className="mt-0">
                 <p className="text-sm text-muted-foreground font-mono">// Advanced settings placeholder (e.g., Validation Pipeline Config)</p>
            </TabsContent>
           </div>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs rounded-none border border-muted text-muted-foreground hover:bg-muted/20 hover:text-foreground"
          >
            Cancel_Changes
          </Button>
          <Button
            onClick={handleSave}
            className="btn-neon-accent font-mono text-xs rounded-none px-4"
          >
            Save_&_Close
          </Button>
        </div>
      </div>
    </div>
  );
}
