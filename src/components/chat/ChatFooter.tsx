import { AnimatePresence, motion } from 'framer-motion';
import { History, Paperclip, Send, Square, Cpu } from 'lucide-react';
import { RiStackFill } from 'react-icons/ri';
import { useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = input;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <footer className="shrink-0 bg-zinc-900/80 border-t border-zinc-900 relative">
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
              defaultValue={input}
              onChange={(e) => {
                setInput(e.target.value);
                setInputError(false);
              }}
              onKeyDown={handleKeyDown}
              disabled={!idle || !!waitingOn}
              rows={1}
              className={`w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-mono text-zinc-200 placeholder-zinc-400 p-0 leading-relaxed outline-none disabled:opacity-50 ${
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
                  className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-2 p-3 bg-zinc-900/80 border border-zinc-800 rounded-md shadow-lg z-20"
                  role="listbox"
                  aria-label="Command suggestions"
                >
                  {availableCommands.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        setInput(`/${cmd} `);
                        if (textareaRef.current) {
                          textareaRef.current.value = `/${cmd} `;
                          textareaRef.current.focus();
                        }
                      }}
                      className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-indigo-400 transition-colors cursor-pointer"
                      role="option"
                    >
                      /{cmd}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="h-10 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              aria-label="Attach file or context"
              title="Attach file or context"
              onClick={() => setShowFileBrowser(true)}
              className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              aria-label={showHistory ? 'Hide command history' : 'Show command history'}
              title={showHistory ? 'Hide command history' : 'Show command history'}
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {idle ? (
              <button
                aria-label="Send message"
                title="Send message"
                onClick={onSubmit}
                className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                aria-label="Abort agent"
                title="Abort agent"
                onClick={() => agentRPCClient.abortAgent({ agentId, reason: 'User abort' })}
                className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showHistory && commandHistory && commandHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-zinc-900/95 border border-zinc-800 rounded-md shadow-lg z-30 max-h-64 overflow-y-auto"
              role="dialog"
              aria-labelledby="history-title"
            >
              <div className="flex items-center justify-between mb-2">
                <span id="history-title" className="text-xs text-zinc-400 font-mono uppercase">Command History</span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] px-2 py-1 rounded"
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
                      if (textareaRef.current) {
                        textareaRef.current.value = cmd;
                        textareaRef.current.focus();
                      }
                      setShowHistory(false);
                    }}
                    className="w-full text-left text-xs font-mono bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

      <div className="h-6 bg-zinc-900/30 flex items-center justify-between px-6 select-none">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-400 font-mono line-clamp-1">{statusLine || 'Ready'}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{input.length} chars</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-500">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">Enter</kbd>
          <span>Send</span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">Shift+Enter</kbd>
          <span>New line</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 ${idle ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full animate-pulse`} />
          <span className={`text-[10px] ${idle ? 'text-indigo-400' : 'text-amber-400'} font-mono uppercase`}>
            {idle ? 'Online' : 'Busy'}
          </span>
        </div>
      </div>
    </footer>
  );
}