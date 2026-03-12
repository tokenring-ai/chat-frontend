import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, History, Paperclip, Send, Square, X, FileText, Image, FileCode, File } from 'lucide-react';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { agentRPCClient } from '../../rpc.ts';
import type { InputAttachment } from '@tokenring-ai/agent/AgentEvents';

interface FileAttachment {
  id: string;
  file: File;
  attachment: InputAttachment;
}

interface ChatFooterProps {
  agentId: string;
  input: string;
  setInput: (value: string) => void;
  inputError: boolean;
  setInputError: (value: boolean) => void;
  idle: boolean;
  statusMessage: string;
  availableCommands: string[];
  commandHistory: string[];
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  setShowFileBrowser: (value: boolean) => void;
  onSubmit: (attachments?: InputAttachment[]) => void;
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return FileCode;
  return File;
}

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ChatFooter({
  agentId,
  input,
  setInput,
  inputError,
  setInputError,
  idle,
  statusMessage,
  availableCommands,
  commandHistory,
  showHistory,
  setShowHistory,
  setShowFileBrowser,
  onSubmit,
}: ChatFooterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historyBuffer, setHistoryBuffer] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const isNavigatingHistoryRef = useRef(false);

  // Reset history navigation when user manually types
  useEffect(() => {
    if (!isNavigatingHistoryRef.current && historyIndex !== null) {
      setHistoryIndex(null);
      setHistoryBuffer('');
    }
    // Reset the ref after the effect runs
    isNavigatingHistoryRef.current = false;
  }, [input, historyIndex]);

  // Read file and convert to InputAttachment
  const readFileAsAttachment = useCallback(async (file: File): Promise<FileAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        const attachment: InputAttachment = {
          type: 'attachment',
          name: file.name,
          encoding: 'base64',
          mimeType: file.type || 'application/octet-stream',
          body: base64,
          timestamp: Date.now(),
        };
        
        resolve({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          attachment,
        });
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newAttachments: FileAttachment[] = [];
    
    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File ${file.name} exceeds 5MB limit`);
        continue;
      }
      
      try {
        const attachment = await readFileAsAttachment(file);
        newAttachments.push(attachment);
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
      }
    }
    
    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [readFileAsAttachment]);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Handle submit with attachments
  const handleSubmitWithAttachments = useCallback(() => {
    const inputAttachments = attachments.length > 0 ? attachments.map(a => a.attachment) : undefined;
    onSubmit(inputAttachments);
    setAttachments([]);
  }, [attachments, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle command suggestions with arrow keys
    if (availableCommands.length > 0 && historyIndex === null) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % availableCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev - 1 + availableCommands.length) % availableCommands.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const cmd = availableCommands[selectedSuggestion];
        setInput(`/${cmd} `);
        textareaRef.current?.focus();
        return;
      }
    }

    // Handle history navigation with arrow keys
    if (availableCommands.length === 0 || historyIndex !== null) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          let newIndex: number;

          if (historyIndex === null) {
            // Start navigating history, save current input
            setHistoryBuffer(input);
            newIndex = commandHistory.length - 1;
          } else if (historyIndex > 0) {
            newIndex = historyIndex - 1;
          } else {
            newIndex = 0;
          }

          setHistoryIndex(newIndex);
          isNavigatingHistoryRef.current = true;
          setInput(commandHistory[newIndex]);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== null) {
          if (historyIndex < commandHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            isNavigatingHistoryRef.current = true;
            setInput(commandHistory[newIndex]);
          } else {
            // Go back to the original input before history navigation
            setHistoryIndex(null);
            setHistoryBuffer('');
            setInput(historyBuffer);
          }
        }
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitWithAttachments();
    }
  };

  return (
    <footer className="shrink-0 bg-secondary border-t border-primary relative">
      <div className="relative">
        {/* Hidden file input for local file upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload files"
        />

        {/* Attachments preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-primary overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-6 py-2">
                {attachments.map(({ id, file, attachment }) => {
                  const Icon = getFileIcon(attachment.mimeType);
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2 bg-tertiary px-3 py-1.5 rounded-md group"
                    >
                      <Icon className="w-4 h-4 text-muted" />
                      <span className="text-xs text-primary font-mono max-w-[150px] truncate">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(id)}
                        className="text-muted hover:text-red-400 transition-colors focus-ring rounded"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start gap-4 px-6 py-4">
          <div className="shrink-0 h-lh items-center flex justify-center select-none text-lg">
            <span className="text-indigo-500 font-bold">&gt;</span>
          </div>

          <div className="flex-1 relative pt-0.75">
            <label htmlFor="chat-input" className="sr-only">Command or message input</label>
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setInputError(false);
              }}
              onKeyDown={handleKeyDown}
              disabled={!idle }
              rows={1}
              className={`w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-mono text-primary placeholder-muted p-0 leading-relaxed outline-none disabled:opacity-50 ${
                inputError ? 'placeholder:text-red-400/50' : ''
              }`}
              placeholder={inputError ? 'Please enter a message or command...' : 'Execute command or send message...'}
              spellCheck="false"
              aria-label="Command or message input"
              aria-describedby={availableCommands.length > 0 ? 'command-suggestions' : undefined}
              aria-invalid={inputError}
              aria-required="true"
              style={{ height: 'auto', minHeight: '1.5rem', maxHeight: '12rem' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />

            <AnimatePresence>
              {availableCommands.length > 0 && (
                <motion.div
                  id="command-suggestions"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-2 p-3 bg-secondary/95 border border-primary rounded-md shadow-xl z-20"
                  role="listbox"
                  aria-label="Command suggestions"
                  aria-activedescendant={`cmd-${selectedSuggestion}`}
                >
                  {availableCommands.map((cmd, idx) => (
                    <button
                      key={cmd}
                      id={`cmd-${idx}`}
                      onClick={() => {
                        setInput(`/${cmd} `);
                        textareaRef.current?.focus();
                      }}
                      className={`text-2xs font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                        idx === selectedSuggestion ? 'bg-indigo-600 text-white' : 'bg-tertiary hover:bg-hover text-indigo-400'
                      }`}
                      role="option"
                      aria-selected={idx === selectedSuggestion}
                    >
                      /{cmd}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Send/Abort button - moved to right of input */}
          <div className="shrink-0">
            {idle ? (
              <button
                aria-label="Send message"
                onClick={handleSubmitWithAttachments}
                className="p-2 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                aria-label="Abort current operation"
                onClick={() => agentRPCClient.abortCurrentOperation({ agentId, message: 'User aborted the current operation via the chat webapp' })}
                className="p-2 rounded hover:bg-hover transition-colors text-muted hover:text-red-400 focus-ring"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-10 py-2 bg-secondary border-t border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            {/* Local file upload button */}
            <button
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              disabled={!idle}
              className="p-1.5 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            {/* Remote file browser button */}
            <button
              aria-label="Browse remote files"
              onClick={() => setShowFileBrowser(true)}
              className="p-1.5 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            <button
              aria-label={showHistory ? 'Hide command history' : 'Show command history'}
              onClick={() => setShowHistory(!showHistory)}
              disabled={commandHistory.length === 0}
              className="p-1.5 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 order-1 sm:order-2" aria-live="polite" aria-atomic="true">
            {/* Right side - status indicator */}
            <div className={`w-2 h-2 ${idle ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full animate-pulse`} aria-label={idle ? 'Agent is online' : 'Agent is busy'} role="status" />
            <span className={`text-2xs ${idle ? 'text-indigo-400' : 'text-amber-400'} font-mono uppercase`}>
              {idle ? 'Online' : 'Busy'}
            </span>
            {attachments.length > 0 && (
              <span className="text-2xs text-cyan-400 font-mono">
                • {attachments.length} file{attachments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showHistory && commandHistory && commandHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-secondary/95 border border-primary rounded-md shadow-xl z-30 max-h-64 overflow-y-auto"
              role="dialog"
              aria-labelledby="history-title"
            >
              <div className="flex items-center justify-between mb-2">
                <span id="history-title" className="text-xs text-muted font-mono uppercase">Command History</span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-muted hover:text-primary focus-ring px-2 py-1 rounded"
                  aria-label="Close command history"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1" role="listbox" aria-label="Previous commands">
                {commandHistory.slice().reverse().map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(cmd);
                      textareaRef.current?.focus();
                      setShowHistory(false);
                    }}
                    className="w-full text-left text-xs font-mono bg-tertiary hover:bg-hover px-3 py-2 rounded text-primary transition-colors focus-ring"
                    role="option"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-6 bg-tertiary flex items-center justify-between px-6 select-none">
        <div className="flex items-center gap-4">
          <span className="text-2xs text-muted font-mono line-clamp-1">{ statusMessage }</span>
          <span className="text-2xs text-dim font-mono">{input.length} chars</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-2xs text-dim">
          <span className="hidden md:inline"><kbd className="px-1.5 py-0.5 bg-tertiary rounded text-primary font-mono">Enter</kbd> Send • <kbd className="px-1.5 py-0.5 bg-tertiary rounded text-primary font-mono">↑/↓</kbd> History • <kbd className="px-1.5 py-0.5 bg-tertiary rounded text-primary font-mono">Shift+Enter</kbd> New line</span>
          <span className="md:hidden">⏎ Send • ↑/↓ History</span>
        </div>
      </div>
    </footer>
  );
}
