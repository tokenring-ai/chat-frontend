import ChatInput from './ChatInput.tsx';

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
  return (
    <footer className="shrink-0 bg-zinc-900/80 border-t border-zinc-900 relative">
      <ChatInput
        agentId={agentId}
        input={input}
        setInput={setInput}
        inputError={inputError}
        setInputError={setInputError}
        idle={idle}
        waitingOn={waitingOn}
        availableCommands={availableCommands}
        commandHistory={commandHistory}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        setShowFileBrowser={setShowFileBrowser}
        onSubmit={onSubmit}
      />

      <div className="h-6 bg-zinc-900/30 flex items-center justify-between px-2 select-none">
        <div className="flex items-center gap-4 px-4">
          <span className="text-[10px] text-zinc-400 font-mono line-clamp-1">{statusLine || 'Ready'}</span>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">Enter</kbd>
            <span>Send</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">Shift+Enter</kbd>
            <span>New line</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4">
          <div className={`w-1.5 h-1.5 ${idle ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full animate-pulse`} />
          <span className={`text-[10px] ${idle ? 'text-indigo-400' : 'text-amber-400'} font-mono uppercase`}>
            {idle ? 'Online' : 'Busy'}
          </span>
        </div>
      </div>
    </footer>
  );
}
