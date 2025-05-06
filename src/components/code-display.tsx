"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Using Tomorrow Night theme
import { Skeleton } from "@/components/ui/skeleton";


interface CodeDisplayProps {
  code: string;
  title?: string;
  language?: string; // Add language prop
  isLoading?: boolean; // Add loading state prop
}

export function CodeDisplay({
    code,
    title = "Generated Code",
    language = "typescript",
    isLoading = false
}: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  // Defer setting displayCode and currentYear until client-side mount
  useEffect(() => {
    setDisplayCode(code || "// Enter a prompt and click 'Generate Code'...");
    setCurrentYear(new Date().getFullYear());
  }, [code]);


  const handleCopy = () => {
    if (!displayCode || isLoading) return; // Don't copy if no code or loading
    navigator.clipboard.writeText(displayCode).then(() => {
      setHasCopied(true);
      toast({
        title: "Copied to clipboard!",
        description: "The generated code has been copied.",
      });
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy the code to clipboard.",
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
    // Use Card component with retro theme applied via globals.css
    <Card className="h-full flex flex-col bg-card border-border shadow-inner overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-3 border-b border-border">
        <CardTitle className="text-lg font-semibold font-mono text-primary">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy code"
          disabled={!displayCode || isLoading || hasCopied} // Disable while loading or if already copied
          className="text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden relative">
        {/* Overlay for Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground font-mono text-center">Generating code, please wait...</p>
             <Skeleton className="h-4 w-3/4 mt-4" />
             <Skeleton className="h-4 w-1/2 mt-2" />
             <Skeleton className="h-4 w-2/3 mt-2" />
          </div>
        )}
        {/* ScrollArea uses theme colors */}
        <ScrollArea className="h-full">
          {displayCode !== null ? (
             <SyntaxHighlighter
                language={language}
                style={tomorrow} // Use Tomorrow Night theme
                customStyle={{
                    margin: 0,
                    backgroundColor: 'hsl(var(--card))', // Match card background
                    color: 'hsl(var(--foreground))', // Ensure text color matches foreground
                    height: '100%',
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    padding: '1rem', // Add padding inside the scroll area
                    fontFamily: 'var(--font-cutive-mono), monospace', // Consistent font
                }}
                 codeTagProps={{ style: { fontFamily: 'var(--font-cutive-mono), monospace' } }}
                 wrapLongLines={true}
                 showLineNumbers={true}
                 lineNumberStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', marginRight: '1rem' }}
              >
                {displayCode}
              </SyntaxHighlighter>
          ) : (
             // Render placeholder or skeleton during initial SSR/hydration before code is ready
             <div className="p-4">
               <Skeleton className="h-4 w-3/4 mb-2" />
               <Skeleton className="h-4 w-1/2 mb-2" />
               <Skeleton className="h-4 w-2/3" />
             </div>
          )}

        </ScrollArea>
      </CardContent>
       <CardFooter className="text-xs text-muted-foreground pt-2 px-4 pb-2 border-t border-border font-mono min-h-[30px]">
         {isLoading ? (
             <div className="flex items-center w-full">
               <Loader2 className="h-3 w-3 animate-spin mr-2" /> Generating...
             </div>
           ) : displayCode && displayCode !== "// Enter a prompt and click 'Generate Code'..." ? (
               `Language: ${language} | Lines: ${displayCode.split('\n').length} | Characters: ${displayCode.length}`
           ) : (
               "Awaiting prompt..."
           )
         }
       </CardFooter>
    </Card>
  );
}
