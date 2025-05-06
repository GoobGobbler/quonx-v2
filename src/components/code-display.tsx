"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Use CJS path for the style as ESM path seems to cause resolution issues in Next.js
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface CodeDisplayProps {
  code: string;
  title?: string;
  language?: string;
  isLoading?: boolean;
  containerClassName?: string; // Allow passing container classes
}

export function CodeDisplay({
    code,
    title = "// Generated_Code //",
    language = "typescript",
    isLoading = false,
    containerClassName
}: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null); // Still needed for footer example

  // Defer setting displayCode and currentYear until client-side mount
  useEffect(() => {
    // Set initial placeholder text or actual code
    setDisplayCode(code || "// Output buffer empty. Execute generation command...");
    setCurrentYear(new Date().getFullYear());
  }, [code]); // Update when code prop changes


  const handleCopy = () => {
    if (!displayCode || isLoading || displayCode === "// Output buffer empty. Execute generation command...") return; // Don't copy placeholder or if loading
    navigator.clipboard.writeText(displayCode).then(() => {
      setHasCopied(true);
      toast({
        title: "SYS: Clipboard Write OK",
        description: "Code copied successfully.",
        className: "font-mono border-primary text-primary", // Terminal style
      });
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({
        variant: "destructive",
        title: "ERR: Clipboard Write Failed",
        description: "Could not copy code.",
        className: "font-mono", // Terminal style
      });
    });
  };

   // Reset copy icon after a delay
  useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => {
        setHasCopied(false);
      }, 2000); // Reset after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [hasCopied]);


  return (
    // Main container div with passed classes
    <div className={cn("h-full flex flex-col bg-background border-border shadow-inner overflow-hidden rounded-none", containerClassName)}>
      {/* Header Section */}
      <div className="flex flex-row items-center justify-between pb-1 px-3 pt-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold font-mono text-primary truncate" title={title}>{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy code"
          disabled={!displayCode || isLoading || hasCopied || displayCode === "// Output buffer empty. Execute generation command..."}
          className="text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed w-6 h-6 p-1 rounded-none border border-transparent hover:border-accent" // Terminal style button
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasCopied ? (
            <Check className="h-4 w-4 text-primary" /> // Use primary green for check
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code Content Area */}
      <div className="flex-grow p-0 overflow-hidden relative">
        {/* Overlay for Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground font-mono text-center">// Processing generation request...</p>
             {/* Simplified skeleton */}
             <div className="w-3/4 mt-4 space-y-2">
                 <Skeleton className="h-3 w-full bg-muted/50" />
                 <Skeleton className="h-3 w-5/6 bg-muted/50" />
                 <Skeleton className="h-3 w-3/4 bg-muted/50" />
             </div>
          </div>
        )}
        {/* ScrollArea for Code */}
        <ScrollArea className="h-full">
          {displayCode !== null ? (
             <SyntaxHighlighter
                language={language}
                style={oneDark} // Use 'oneDark' theme
                customStyle={{
                    margin: 0,
                    backgroundColor: 'hsl(var(--background))', // Use CSS variable for background
                    color: 'hsl(var(--foreground))', // Ensure text color matches foreground
                    height: '100%',
                    overflow: 'auto',
                    fontSize: '0.8rem', // Slightly smaller font for terminal feel
                    padding: '0.5rem 1rem', // Adjust padding
                    fontFamily: 'var(--font-source-code-pro, var(--font-cutive-mono, monospace))', // Consistent font from layout
                    lineHeight: '1.4', // Adjust line height
                }}
                 codeTagProps={{ style: { fontFamily: 'inherit' } }} // Inherit font family
                 wrapLongLines={true}
                 showLineNumbers={true}
                 // Terminal-style line numbers
                 lineNumberStyle={{ color: 'hsl(var(--muted-foreground) / 0.6)', fontSize: '0.7rem', marginRight: '1rem', userSelect: 'none' }}
              >
                {displayCode}
              </SyntaxHighlighter>
          ) : (
             // Simple text placeholder during SSR/hydration before code is ready
             <div className="p-4 text-muted-foreground font-mono text-sm">
               // Initializing output buffer...
             </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer Section */}
       <div className="text-xs text-muted-foreground pt-1 px-3 pb-1 border-t border-border font-mono min-h-[25px] flex items-center flex-shrink-0">
         {isLoading ? (
             <>
               <Loader2 className="h-3 w-3 animate-spin mr-2" /> Transmitting...
             </>
           ) : displayCode && displayCode !== "// Output buffer empty. Execute generation command..." ? (
               `LN: ${displayCode.split('\n').length} | CH: ${displayCode.length} | LANG: ${language}`
           ) : (
               "// Awaiting command..."
           )
         }
       </div>
    </div>
  );
}
