import { AnimatePresence, motion } from 'framer-motion';
import { History, Paperclip, Send, Square } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';
import { agentRPCClient } from '../../rpc.ts';

interface ChatFooterProps {
  agentId: string;
  input: string;
  setInput: (value: string) => void;
  inputError: boolean;
  setInputError: (value: boolean) => void;
  idle: boolean;
  waitingOn?: string;
  statusLine?: string;
  availableCommands: string[];
  commandHistory: string[];
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  setShowFileBrowser: (value: boolean) => void;
  onSubmit: () => void;
}

export default function ChatFooter({
  agentId,
  input,
  setInput,
  inputError,
  setInputError,
  idle,
  waitingOn,
  statusLine,
  availableCommands,
  commandHistory,
  showHistory,
  setShowHistory,
  setShowFileBrowser,
  onSubmit,
}: ChatFooterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [historyBuffer, setHistoryBuffer] = useState('');
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
      onSubmit();
    }
  };

  return (
    <footer className="shrink-0 bg-secondary border-t border-primary relative">
      <div className="relative">
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
              disabled={!idle || !!waitingOn}
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
                onClick={onSubmit}
                className="p-2 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                aria-label="Abort agent"
                onClick={() => agentRPCClient.abortAgent({ agentId, message: 'User aborted the current operation via the chat webapp' })}
                className="p-2 rounded hover:bg-hover transition-colors text-muted hover:text-red-400 focus-ring"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-10 py-2 bg-secondary border-t border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            {/* File attachment button */}
            <button
              aria-label="Attach file or context"
              onClick={() => setShowFileBrowser(true)}
              className="p-1.5 rounded hover:bg-hover transition-colors text-muted hover:text-primary focus-ring"
            >
              <Paperclip className="w-5 h-5" />
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
          <span className="text-2xs text-muted font-mono line-clamp-1">{statusLine || 'Ready'}</span>
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
