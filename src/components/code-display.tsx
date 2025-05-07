"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Loader2, FileCode2, Files } from "lucide-react"; // Added FileCode2, Files
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import the oneDark style directly to avoid issues with the library's style index.
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
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
      // Only return a file if activeFilePath is set and found
      return files.find(f => f.filePath === activeFilePath) || null;
    }
    // If 'files' is a single FileObject
    return files;
  }, [files, activeFilePath]);

  // Determine the content and title based on state
  let codeToDisplay: string;
  let displayTitle: string;
  let language = "plaintext"; // Default language

  if (isLoading) {
    codeToDisplay = LOADING_CODE;
    displayTitle = "// Processing AI Request...";
  } else if (currentFileToDisplay) {
    codeToDisplay = currentFileToDisplay.content;
    displayTitle = `// ${currentFileToDisplay.filePath} //`;
    language = currentFileToDisplay.filePath?.split('.').pop() || "plaintext";
  } else if (Array.isArray(files) && files.length > 0) {
    // Show summary if multiple files generated but none are active
    codeToDisplay = MULTIPLE_FILES_SUMMARY(files.length);
    displayTitle = "// Multi-File Output //";
  } else {
    // Placeholder if no files and not loading
    codeToDisplay = PLACEHOLDER_CODE;
    displayTitle = "// IDE_Output_Buffer //";
  }

  const handleCopy = () => {
    // Only allow copying if a specific file is displayed
    if (!currentFileToDisplay?.content || isLoading) {
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
        description: `// Content of ${currentFileToDisplay.filePath} copied.`,
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

  // Determine if copy button should be disabled
  const isCopyDisabled = !currentFileToDisplay?.content || isLoading || hasCopied;

  return (
    <div className={cn("h-full flex flex-col bg-card border border-border shadow-inner overflow-hidden rounded-none", containerClassName)}>
      <div className="flex flex-row items-center justify-between pb-1 px-3 pt-1.5 border-b border-border flex-shrink-0 bg-card/50"> {/* Subtle bg */}
        <div className="flex items-center text-sm font-semibold font-mono text-primary truncate mr-2" title={displayTitle}>
            {/* Icon logic based on what's being displayed */}
            {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> :
             currentFileToDisplay ? <FileCode2 className="h-3.5 w-3.5 mr-1.5" /> :
             (Array.isArray(files) && files.length > 0) ? <Files className="h-3.5 w-3.5 mr-1.5" /> :
             <div className="h-3.5 w-3.5 mr-1.5"></div> /* Placeholder space */}
            <span className="truncate">{displayTitle}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy code"
          disabled={isCopyDisabled}
          className="text-accent hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed w-6 h-6 p-1 rounded-none border border-transparent hover:border-accent neon-glow"
        >
          {hasCopied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-grow p-0 overflow-hidden relative bg-background"> {/* Ensure background consistency */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4 text-center">
             <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
             <p className="text-muted-foreground font-mono text-sm">// Processing AI request...</p>
             <p className="text-muted-foreground font-mono text-xs mt-1">// Generating code structure...</p>
             <div className="w-full max-w-xs mt-4 space-y-1.5">
                 <Skeleton className="h-2.5 w-full bg-muted/40" />
                 <Skeleton className="h-2.5 w-5/6 bg-muted/40" />
                 <Skeleton className="h-2.5 w-3/4 bg-muted/40" />
             </div>
          </div>
        )}
        <ScrollArea className="h-full">
          {codeToDisplay === PLACEHOLDER_CODE || codeToDisplay === LOADING_CODE || codeToDisplay.startsWith(MULTIPLE_FILES_SUMMARY(0).substring(0,10)) ? (
             <div className="p-4 text-muted-foreground font-mono text-sm h-full flex items-center justify-center opacity-70">
               <pre className="whitespace-pre-wrap text-center">{codeToDisplay}</pre> {/* Use pre for formatting */}
             </div>
           ) : (
             <SyntaxHighlighter
                language={language}
                style={oneDark} // Use the imported style
                customStyle={{
                    margin: 0,
                    // Use CSS variables for background/foreground for theme consistency
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    height: '100%',
                    overflow: 'auto',
                    fontSize: '0.75rem', // Slightly smaller font for code
                    padding: '0.75rem 1rem', // Adjusted padding
                    fontFamily: 'var(--font-source-code-pro, var(--font-cutive-mono, monospace))',
                    lineHeight: '1.35', // Adjusted line height
                }}
                 codeTagProps={{ style: { fontFamily: 'inherit' } }}
                 wrapLongLines={false} // Disable wrap by default for code
                 showLineNumbers={true}
                 lineNumberStyle={{ color: 'hsl(var(--muted-foreground) / 0.5)', fontSize: '0.65rem', marginRight: '1rem', userSelect: 'none', paddingRight: '1rem', borderRight: '1px solid hsl(var(--border)/0.3)' }}
              >
                {codeToDisplay}
              </SyntaxHighlighter>
           )}
        </ScrollArea>
      </div>

       <div className="text-xs text-muted-foreground pt-1 px-3 pb-1 border-t border-border font-mono min-h-[25px] flex items-center flex-shrink-0 bg-card/50 flex-wrap gap-x-3 gap-y-0.5"> {/* Use card bg, allow wrapping */}
         {isLoading ? (
             <>
               <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Transmitting...
             </>
           ) : currentFileToDisplay ? (
               <>
                <span>LN: {lineCount}</span>
                <span>CH: {charCount}</span>
                <span>LANG: {language.toUpperCase()}</span>
                <span className="truncate" title={currentFileToDisplay.filePath}>PATH: {currentFileToDisplay.filePath}</span>
               </>
           ) : (Array.isArray(files) && files.length > 0) ? (
               <span>// {files.length} files generated. Select one to view details.</span>
           ) : (
               <span>// Awaiting command or file selection...</span>
           )
         }
       </div>
    </div>
  );
}