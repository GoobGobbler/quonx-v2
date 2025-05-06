"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


interface CodeDisplayProps {
  code: string;
  title?: string;
}

export function CodeDisplay({ code, title = "Generated Code" }: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
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
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy code">
          {hasCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-accent" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full">
           {/* Using react-syntax-highlighter. Needs installation: npm install react-syntax-highlighter @types/react-syntax-highlighter */}
           {/* Wrap in a client component or dynamically import if needed */}
          <SyntaxHighlighter
            language="typescript" // Adjust language based on expected output, or make dynamic
            style={vscDarkPlus} // Or choose another theme
            customStyle={{ margin: 0, padding: '1rem', height: '100%', overflow: 'auto', background: 'hsl(var(--card))' }}
            codeTagProps={{ style: { fontFamily: 'var(--font-geist-mono)' } }} // Use Geist Mono if available
            wrapLongLines={true}
          >
            {code || "No code generated yet."}
          </SyntaxHighlighter>
        </ScrollArea>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-2">
        {code ? `Code length: ${code.length} characters` : "Enter a prompt to generate code."}
      </CardFooter>
    </Card>
  );
}
