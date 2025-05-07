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

const PLACEHOLDER_CODE = "// Output buffer empty. Execute generation command or select a file...";
const LOADING_CODE = "// Initializing output buffer...";

export function CodeDisplay({
    code,
    title = "// Generated_Code_Buffer //",
    language = "typescript",
    isLoading = false,
    containerClassName
}: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  // No need for displayCode state, directly use `code` prop which will be updated by parent
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  const handleCopy = () => {
    if (!code || isLoading || code === PLACEHOLDER_CODE || code === LOADING_CODE) return;
    navigator.clipboard.writeText(code).then(() => {
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

  useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCopied]);

  const displayTitle = title || (isLoading ? "// Processing..." : "// IDE_Buffer");
  const codeToDisplay = code || PLACEHOLDER_CODE;
  const lineCount = codeToDisplay.split('\n').length;
  const charCount = codeToDisplay.length;


  return (
    <div className={cn("h-full flex flex-col bg-background border-border shadow-inner overflow-hidden rounded-none", containerClassName)}>
      <div className="flex flex-row items-center justify-between pb-1 px-3 pt-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold font-mono text-primary truncate" title={displayTitle}>{displayTitle}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy code"
          disabled={!code || isLoading || hasCopied || code === PLACEHOLDER_CODE || code === LOADING_CODE}
          className="text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed w-6 h-6 p-1 rounded-none border border-transparent hover:border-accent neon-glow"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasCopied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-grow p-0 overflow-hidden relative">
        {isLoading && ( // Show loading overlay ONLY if isLoading is true
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground font-mono text-center">// Processing AI request...</p>
             <div className="w-3/4 mt-4 space-y-2">
                 <Skeleton className="h-3 w-full bg-muted/50" />
                 <Skeleton className="h-3 w-5/6 bg-muted/50" />
                 <Skeleton className="h-3 w-3/4 bg-muted/50" />
             </div>
          </div>
        )}
        <ScrollArea className="h-full">
          {codeToDisplay === LOADING_CODE && !isLoading ? ( // Show placeholder if code is null/undefined but not actively loading
             <div className="p-4 text-muted-foreground font-mono text-sm h-full flex items-center justify-center">
               <p>{PLACEHOLDER_CODE}</p>
             </div>
           ) : (
             <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    height: '100%',
                    overflow: 'auto',
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    fontFamily: 'var(--font-source-code-pro, var(--font-cutive-mono, monospace))',
                    lineHeight: '1.4',
                }}
                 codeTagProps={{ style: { fontFamily: 'inherit' } }}
                 wrapLongLines={true}
                 showLineNumbers={true}
                 lineNumberStyle={{ color: 'hsl(var(--muted-foreground) / 0.6)', fontSize: '0.7rem', marginRight: '1rem', userSelect: 'none' }}
              >
                {codeToDisplay}
              </SyntaxHighlighter>
           )}
        </ScrollArea>
      </div>

       <div className="text-xs text-muted-foreground pt-1 px-3 pb-1 border-t border-border font-mono min-h-[25px] flex items-center flex-shrink-0">
         {isLoading ? (
             <>
               <Loader2 className="h-3 w-3 animate-spin mr-2" /> Transmitting...
             </>
           ) : code && code !== PLACEHOLDER_CODE && code !== LOADING_CODE ? (
               `LN: ${lineCount} | CH: ${charCount} | LANG: ${language}`
           ) : (
               "// Awaiting command or file selection..."
           )
         }
       </div>
    </div>
  );
}
