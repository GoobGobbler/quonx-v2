
'use client'; // Need client component to access localStorage

import type { Metadata } from 'next';
// Import multiple fonts if needed for settings
import { Cutive_Mono, Source_Code_Pro, VT323 } from 'next/font/google'; // Added Source Code Pro, VT323
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { cn } from '@/lib/utils'; // Import cn utility

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

// Define settings structure (mirror from settings-panel)
interface AppSettings {
    ollamaBaseUrl: string;
    googleApiKey: string;
    openRouterApiKey: string;
    themePreset: string;
    font: string;
    enableScanlines: boolean;
    enableGrain: boolean;
    enableGlow: boolean;
}

const defaultSettings: Partial<AppSettings> = { // Use Partial for defaults
    font: 'Cutive Mono',
    enableScanlines: true,
    enableGrain: true,
    enableGlow: true,
};

const SETTINGS_STORAGE_KEY = 'codesynth_settings';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, setSettings] = useState<Partial<AppSettings>>(defaultSettings);
  const [isClient, setIsClient] = useState(false); // Track if running on client

  useEffect(() => {
    setIsClient(true); // Component has mounted on the client
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error("Failed to load settings in layout:", error);
      // Keep default settings
    }
  }, []);

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
    'font-mono antialiased bg-background text-foreground', // Base classes
    getFontClassName(settings.font),
    {
      'scanlines-effect': settings.enableScanlines,
      'grain-effect': settings.enableGrain,
      // Glow effect is often applied to specific elements, not the body
    },
    isClient ? '' : 'invisible' // Prevent hydration mismatch flash by hiding server render initially
  );


  return (
    // Add font variables to html tag
    <html lang="en" className={`${fontVariables} dark`}>
       <head>
           {/* Static metadata can go here */}
           <title>CodeSynth Terminal - Multi-AI IDE Platform</title>
           <meta name="description" content="Collaborative AI-powered development with Ollama, Gemini, OpenRouter support, MLOps, security scanning, and advanced IDE features in a retro-futuristic terminal." />
       </head>
       <body className={bodyClasses}>
           {/* Conditionally render children only after client-side settings are loaded */}
            {isClient ? (
                 <>
                     {/* TODO: Add providers */}
                     {children}
                     <Toaster />
                 </>
             ) : (
                 // Optional: Render a simple loading state or nothing during SSR/initial load
                 <div className="flex items-center justify-center h-screen">
                     <p className="text-muted-foreground animate-pulse">Initializing Interface...</p>
                 </div>
             )}
       </body>
    </html>
  );
}
