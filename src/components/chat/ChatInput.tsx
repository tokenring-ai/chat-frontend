import { AnimatePresence, motion } from 'framer-motion';
import { History, Paperclip, Send, Square } from 'lucide-react';
import { agentRPCClient } from '../../rpc.ts';

interface ChatInputProps {
  agentId: string;
  input: string;
  setInput: (value: string) => void;
  inputError: boolean;
  setInputError: (value: boolean) => void;
  idle: boolean;
  waitingOn?: string;
  availableCommands: string[];
  commandHistory: string[];
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  setShowFileBrowser: (value: boolean) => void;
  onSubmit: () => void;
}

export default function ChatInput({
  agentId,
  input,
  setInput,
  inputError,
  setInputError,
  idle,
  waitingOn,
  availableCommands,
  commandHistory,
  showHistory,
  setShowHistory,
  setShowFileBrowser,
  onSubmit,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-start gap-4 px-6 py-4">
        <div className="shrink-0 h-lh items-center flex justify-center select-none text-lg">
          <span className="text-indigo-500 font-bold">&gt;</span>
        </div>

        <div className="flex-1 relative pt-0.75 flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Command or message input</label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputError(false);
            }}
            onKeyDown={handleKeyDown}
            disabled={!idle || !!waitingOn}
            className={`flex-1 bg-transparent border-none focus:ring-0 resize-none h-16 md:h-24 text-sm font-mono text-zinc-200 placeholder-zinc-400 p-0 leading-relaxed outline-none disabled:opacity-50 ${
              inputError ? 'placeholder:text-red-400/50' : ''
            }`}
            placeholder={inputError ? 'Please enter a message or command...' : 'Execute command or send message...'}
            spellCheck="false"
            aria-label="Command or message input"
            aria-describedby={availableCommands.length > 0 ? 'command-suggestions' : undefined}
            aria-invalid={inputError}
            aria-required="true"
          />

          <div className="absolute bottom-0 right-0">
            <span className="text-[10px] text-zinc-600 font-mono">{input.length} chars</span>
          </div>

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
                    onClick={() => setInput(`/${cmd} `)}
                    className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-indigo-400 transition-colors cursor-pointer"
                    role="option"
                  >
                    /{cmd}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex md:flex-row flex-col gap-2 sm:gap-3 pl-2 pb-1 pr-1 sm:pr-0 md:self-end self-start">
            {idle ? (
              <button
                aria-label="Send message"
                onClick={onSubmit}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center min-w-[40px] text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                aria-label="Abort agent"
                onClick={() => agentRPCClient.abortAgent({ agentId, reason: 'User abort' })}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center min-w-[40px] text-zinc-400 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
            <button
              aria-label="Attach file or context"
              onClick={() => setShowFileBrowser(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center min-w-[40px] text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              aria-label={showHistory ? 'Hide command history' : 'Show command history'}
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center min-w-[40px] text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
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
  );
}
