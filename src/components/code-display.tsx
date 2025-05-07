
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Loader2, FileCode2, Files } from "lucide-react"; // Added FileCode2, Files
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { FileObject } from '@/ai/flows/generate-code-from-prompt'; // Import FileObject type

// Define a type for what can be displayed (single file or array of files)
export type DisplayableFile = FileObject;

interface CodeDisplayProps {
  files: DisplayableFile | DisplayableFile[] | null; // Can be a single file, an array, or null
  activeFilePath?: string | null; // Path of the file to display if `files` is an array
  isLoading?: boolean;
  containerClassName?: string;
}

const PLACEHOLDER_CODE = "// Output buffer empty. Execute generation command or select a file...";
const LOADING_CODE = "// Initializing output buffer...";
const MULTIPLE_FILES_SUMMARY = (count: number) => `// ${count} files generated. Select a file from the explorer to view its content.`;

export function CodeDisplay({
    files,
    activeFilePath,
    isLoading = false,
    containerClassName
}: CodeDisplayProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Determine which file to display
  const currentFileToDisplay: DisplayableFile | null = React.useMemo(() => {
    if (!files) return null;
    if (Array.isArray(files)) {
      if (activeFilePath) {
        return files.find(f => f.filePath === activeFilePath) || files[0] || null;
      }
      return files[0] || null; // Default to first file if no active path and files is array
    }
    return files; // If it's a single FileObject
  }, [files, activeFilePath]);

  const codeToDisplay = currentFileToDisplay?.content || (Array.isArray(files) && files.length > 0 ? MULTIPLE_FILES_SUMMARY(files.length) : PLACEHOLDER_CODE);
  const displayTitle = isLoading 
    ? "// Processing..." 
    : currentFileToDisplay?.filePath 
      ? `// ${currentFileToDisplay.filePath} //` 
      : Array.isArray(files) && files.length > 0 
        ? "// Multi-File Output //" 
        : "// IDE_Buffer //";
  
  const language = currentFileToDisplay?.filePath?.split('.').pop() || "plaintext";

  const handleCopy = () => {
    if (!currentFileToDisplay?.content || isLoading || currentFileToDisplay.content === PLACEHOLDER_CODE || currentFileToDisplay.content === LOADING_CODE || currentFileToDisplay.content.startsWith("// Multiple files generated")) {
        toast({
            variant: "destructive",
            title: "SYS: Nothing to Copy",
            description: "No specific file content is active to copy.",
            className: "font-mono",
        });
        return;
    }
    navigator.clipboard.writeText(currentFileToDisplay.content).then(() => {
      setHasCopied(true);
      toast({
        title: "SYS: Clipboard Write OK",
        description: `Content of ${currentFileToDisplay.filePath} copied.`,
        className: "font-mono border-primary text-primary",
      });
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({
        variant: "destructive",
        title: "ERR: Clipboard Write Failed",
        description: "Could not copy code.",
        className: "font-mono",
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
  
  const lineCount = codeToDisplay.split('\n').length;
  const charCount = codeToDisplay.length;

  return (
    <div className={cn("h-full flex flex-col bg-background border-border shadow-inner overflow-hidden rounded-none", containerClassName)}>
      <div className="flex flex-row items-center justify-between pb-1 px-3 pt-2 border-b border-border flex-shrink-0">
        <div className="flex items-center text-sm font-semibold font-mono text-primary truncate" title={displayTitle}>
            {Array.isArray(files) && files.length > 1 && !currentFileToDisplay ? <Files className="h-4 w-4 mr-1.5" /> : <FileCode2 className="h-4 w-4 mr-1.5" />}
            {displayTitle}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy code"
          disabled={!currentFileToDisplay?.content || isLoading || hasCopied || currentFileToDisplay.content === PLACEHOLDER_CODE || currentFileToDisplay.content === LOADING_CODE || currentFileToDisplay.content.startsWith(MULTIPLE_FILES_SUMMARY(0).substring(0,10))} // Check prefix
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
        {isLoading && (
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
          {codeToDisplay === PLACEHOLDER_CODE || codeToDisplay === LOADING_CODE || codeToDisplay.startsWith(MULTIPLE_FILES_SUMMARY(0).substring(0,10)) ? (
             <div className="p-4 text-muted-foreground font-mono text-sm h-full flex items-center justify-center">
               <p>{codeToDisplay}</p>
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
           ) : codeToDisplay && codeToDisplay !== PLACEHOLDER_CODE && codeToDisplay !== LOADING_CODE && !codeToDisplay.startsWith(MULTIPLE_FILES_SUMMARY(0).substring(0,10)) ? (
               `LN: ${lineCount} | CH: ${charCount} | LANG: ${language} ${currentFileToDisplay?.filePath ? `| PATH: ${currentFileToDisplay.filePath}` : ''}`
           ) : (
               Array.isArray(files) && files.length > 0 ? `// ${files.length} files generated. Select one to view details.` : "// Awaiting command or file selection..."
           )
         }
       </div>
    </div>
  );
}
