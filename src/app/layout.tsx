
'use client'; // Need client component to access localStorage

import type { Metadata } from 'next';
// Import multiple fonts if needed for settings
import { Cutive_Mono, Source_Code_Pro, VT323 } from 'next/font/google'; // Added Source Code Pro, VT323
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { cn } from '@/lib/utils'; // Import cn utility
import { AppSettings, defaultSettings, SETTINGS_STORAGE_KEY } from '@/components/settings-panel'; // Import settings types and constants
import { TooltipProvider } from '@/components/ui/tooltip'; // Ensure TooltipProvider wraps the layout
import { SidebarProvider } from '@/components/ui/sidebar'; // Ensure SidebarProvider wraps layout

// Configure fonts
const cutiveMono = Cutive_Mono({
  variable: '--font-cutive-mono',
  weight: '400',
  subsets: ['latin'],
});

const sourceCodePro = Source_Code_Pro({
  variable: '--font-source-code-pro',
  weight: ['400', '700'], // Example weights
  subsets: ['latin'],
});

const vt323 = VT323({
  variable: '--font-vt323',
  weight: '400',
  subsets: ['latin'],
});

// Combine font variables
const fontVariables = `${cutiveMono.variable} ${sourceCodePro.variable} ${vt323.variable}`;

// // Metadata needs to be static or generated server-side, cannot depend on client state
// export const metadata: Metadata = {
//   title: 'CodeSynth Terminal - Multi-AI IDE Platform',
//   description: 'Collaborative AI-powered development with Ollama, Gemini, OpenRouter support, MLOps, security scanning, and advanced IDE features in a retro-futuristic terminal.',
// };
// We will set the title dynamically in the component if needed, or keep it static.


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isClient, setIsClient] = useState(false); // Track if running on client

  useEffect(() => {
    setIsClient(true); // Component has mounted on the client
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Merge defaults with stored settings to handle missing/new keys gracefully
        setSettings({ ...defaultSettings, ...parsedSettings });
      } else {
         setSettings(defaultSettings); // Explicitly set defaults if nothing stored
      }
    } catch (error) {
      console.error("Failed to load settings in layout:", error);
      setSettings(defaultSettings); // Fallback to defaults on error
    }
  }, []); // Run once on mount

  const getFontClassName = (fontName: string | undefined) => {
      switch (fontName) {
          case 'Source Code Pro': return sourceCodePro.className;
          case 'VT323': return vt323.className;
          case 'Cutive Mono':
          default: return cutiveMono.className;
      }
  };

  // Determine body classes based on settings
  const bodyClasses = cn(
    'font-mono antialiased bg-background text-foreground min-h-screen', // Base classes, ensure min-h-screen
    getFontClassName(settings.font), // Apply font class dynamically
    {
      'scanlines-effect': settings.enableScanlines,
      'grain-effect': settings.enableGrain,
      // Glow effect is often applied to specific elements, not the body
    }
    // Removed: isClient ? '' : 'invisible' - Simplify to avoid potential hiding issues
  );


  return (
    // Add font variables to html tag, enforce dark mode
    <html lang="en" className={cn(fontVariables, 'dark')}>
       <head>
           {/* Static metadata can go here */}
           <title>CodeSynth Terminal - AI IDE Platform</title>
           <meta name="description" content="AI-powered development environment with support for multiple models and advanced IDE features." />
       </head>
       <body className={bodyClasses}>
           {/* Wrap children with necessary providers */}
            <TooltipProvider delayDuration={100}>
                <SidebarProvider>
                     {children}
                     <Toaster />
                </SidebarProvider>
            </TooltipProvider>
       </body>
    </html>
  );
}
