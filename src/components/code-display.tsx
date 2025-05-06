"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Using a more retro/dark theme like 'okaidia' or 'tomorrow' might fit better
// import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'; // A good dark theme


interface CodeDisplayProps {
  code: string;
  title?: string;
  language?: string; // Add language prop
}

export function CodeDisplay({ code, title = "Generated Code", language = "typescript" }: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return; // Don't copy if there's no code
    navigator.clipboard.writeText(code).then(() => {
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
        <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy code" disabled={!code} className="text-accent hover:bg-accent/10 disabled:opacity-50">
          {hasCopied ? (
            <Check className="h-4 w-4 text-green-500" /> // Keep check green for feedback
          ) : (
            <Copy className="h-4 w-4" /> // Icon color will be inherited from text-accent
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        {/* ScrollArea uses theme colors */}
        <ScrollArea className="h-full">
          <SyntaxHighlighter
            language={language} // Use the language prop
            style={tomorrow} // Use a suitable theme
            customStyle={{
                margin: 0,
                // Match the card background for seamless look
                // Using CSS variables ensures theme consistency
                backgroundColor: 'hsl(var(--card))',
                height: '100%',
                overflow: 'auto',
                fontSize: '0.875rem', // Slightly larger for readability
                padding: '1rem', // Add padding inside the scroll area
            }}
            codeTagProps={{ style: { fontFamily: 'var(--font-cutive-mono), monospace' } }} // Use CSS var for font
            wrapLongLines={true}
            showLineNumbers={true} // Show line numbers like an IDE
            lineNumberStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', marginRight: '1rem' }} // Style line numbers
          >
            {code || "// Enter a prompt and click 'Generate Code'..."}
          </SyntaxHighlighter>
        </ScrollArea>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-2 px-4 pb-2 border-t border-border font-mono">
        {code ? `Model: ${language} | Lines: ${code.split('\n').length} | Chars: ${code.length}` : "Awaiting prompt..."}
      </CardFooter>
    </Card>
  );
}
