
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

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
      <div className="popup-content w-full max-w-3xl h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="popup-close-button"
          aria-label="Close popup"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-mono text-primary mb-3 border-b border-border pb-2">
          // Edit_File: {filePathToEdit || "Selected Code"} //
        </h2>

        <div className="flex flex-col md:flex-row gap-4 flex-grow overflow-hidden">
          {/* Left Side: Code Preview */}
          <div className="md:w-1/2 h-1/2 md:h-full flex flex-col border border-border rounded-sm overflow-hidden">
            <Label className="p-2 text-sm font-mono text-muted-foreground border-b border-border">
              Current Content of {filePathToEdit || "Active Buffer"}:
            </Label>
            <ScrollArea className="flex-grow bg-background">
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  backgroundColor: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  height: '100%',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  fontFamily: 'var(--font-cutive-mono), monospace',
                  lineHeight: '1.3',
                }}
                codeTagProps={{
                  style: { fontFamily: 'var(--font-cutive-mono), monospace' },
                }}
                wrapLongLines={true}
                showLineNumbers={true}
                lineNumberStyle={{
                  color: 'hsl(var(--muted-foreground) / 0.6)',
                  fontSize: '0.7rem',
                  marginRight: '0.5rem',
                  userSelect: 'none',
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
              className="flex flex-col gap-3 flex-grow"
            >
              <div className="flex flex-col gap-1.5 flex-grow">
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
                  className="text-sm font-mono bg-input border border-border focus:ring-1 focus:ring-ring focus:border-accent caret-accent selection:bg-accent/30 disabled:opacity-70 disabled:cursor-not-allowed rounded-none resize-none flex-grow terminal-input"
                  disabled={isLoading}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground font-mono">
                  // The AI will use the current content of <span className="text-accent">{filePathToEdit || "this buffer"}</span> and your instructions.
                  {selectedModelId && ` (Using: ${selectedModelId})`}
                </p>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !editPrompt.trim()}
                className="w-full sm:w-auto btn-neon font-mono text-sm rounded-none px-4 py-1.5 mt-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
