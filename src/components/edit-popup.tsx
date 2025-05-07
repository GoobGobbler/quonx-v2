
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import the same dark theme used in CodeDisplay
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface EditPopupProps {
  initialCode: string;
  filePathToEdit: string; // Added to give context about which file is being edited
  onSubmit: (editPrompt: string) => void; // onSubmit now just takes the prompt, context is handled by parent
  onClose: () => void;
  isLoading: boolean;
  selectedModelId?: string;
}

export function EditPopup({
  initialCode,
  filePathToEdit,
  onSubmit,
  onClose,
  isLoading,
  selectedModelId,
}: EditPopupProps) {
  const [editPrompt, setEditPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      // The parent (page.tsx) will now handle providing the correct previousCode context to the AI flow
      onSubmit(editPrompt);
    }
  };

  const language = filePathToEdit?.split('.').pop() || "tsx";


  return (
    <div className="popup-overlay">
      {/* Adjusted max width and height */}
      <div className="popup-content w-full max-w-4xl h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="popup-close-button"
          aria-label="Close popup"
          disabled={isLoading}
        >
          <X size={18} /> {/* Slightly smaller close icon */}
        </button>

        <h2 className="text-base md:text-lg font-mono text-primary mb-3 border-b border-border pb-1.5 flex-shrink-0"> {/* Adjusted size/padding */}
          // Edit_File: {filePathToEdit || "Selected Code"} //
        </h2>

        <div className="flex flex-col md:flex-row gap-3 flex-grow overflow-hidden"> {/* Adjusted gap */}
          {/* Left Side: Code Preview */}
          <div className="md:w-1/2 h-1/2 md:h-full flex flex-col border border-border rounded-sm overflow-hidden bg-background"> {/* Ensure bg */}
            <Label className="p-1.5 text-xs font-mono text-muted-foreground border-b border-border flex-shrink-0"> {/* Adjusted size/padding */}
              Current Content of {filePathToEdit || "Active Buffer"}:
            </Label>
            <ScrollArea className="flex-grow">
              <SyntaxHighlighter
                language={language}
                style={oneDark} // Use the imported style
                customStyle={{
                  margin: 0,
                  backgroundColor: 'hsl(var(--background))', // Use theme variable
                  color: 'hsl(var(--foreground))', // Use theme variable
                  height: '100%',
                  overflow: 'auto',
                  fontSize: '0.7rem', // Smaller font for preview
                  padding: '0.5rem',
                  fontFamily: 'var(--font-source-code-pro, var(--font-cutive-mono, monospace))', // Consistent font
                  lineHeight: '1.3',
                }}
                codeTagProps={{
                  style: { fontFamily: 'inherit' }, // Inherit font family
                }}
                wrapLongLines={false} // Don't wrap code preview
                showLineNumbers={true}
                lineNumberStyle={{
                  color: 'hsl(var(--muted-foreground) / 0.5)', // Theme variable
                  fontSize: '0.65rem', // Smaller line numbers
                  marginRight: '0.75rem', // Adjusted margin
                  userSelect: 'none',
                  paddingRight: '0.75rem',
                  borderRight: '1px solid hsl(var(--border)/0.3)',
                }}
              >
                {initialCode}
              </SyntaxHighlighter>
            </ScrollArea>
          </div>

          {/* Right Side: Edit Prompt Input */}
          <div className="md:w-1/2 h-1/2 md:h-full flex flex-col">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 flex-grow" // Adjusted gap
            >
              <div className="flex flex-col gap-1 flex-grow"> {/* Adjusted gap */}
                <Label
                  htmlFor="edit-prompt"
                  className="font-mono text-secondary text-sm"
                >
                  &gt; Edit_Instructions (for {filePathToEdit || "this code"}):
                </Label>
                <Textarea
                  placeholder={`// Describe the changes needed for ${filePathToEdit || "the current code"} (e.g., 'Refactor the button component', 'Add error handling')...`}
                  id="edit-prompt"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="text-xs md:text-sm font-mono bg-input border border-border focus:ring-1 focus:ring-ring focus:border-accent caret-accent selection:bg-accent/30 disabled:opacity-70 disabled:cursor-not-allowed rounded-none resize-none flex-grow terminal-input p-2" // Adjusted padding/size
                  disabled={isLoading}
                  rows={5} // Adjusted rows
                />
                <p className="text-xs text-muted-foreground font-mono">
                  // AI uses current content of <span className="text-accent">{filePathToEdit || "this buffer"}</span> + instructions.
                  {selectedModelId && ` (Model: ${selectedModelId})`}
                </p>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !editPrompt.trim()}
                className="w-full sm:w-auto btn-neon-accent font-mono text-xs md:text-sm rounded-none px-3 py-1.5 mt-auto h-8" // Use Accent button, adjusted size/padding
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {/* Adjusted margin */}
                    Processing Edit...
                  </>
                ) : (
                  'Execute_Edit'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
