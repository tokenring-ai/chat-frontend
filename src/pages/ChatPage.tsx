import type { AgentEventEnvelope } from "@tokenring-ai/agent/AgentEvents";
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronDown, FileCode, History, Info, Paperclip, Send, Square, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ArtifactViewer from '../components/ArtifactViewer.tsx';
import ImmediateRequest from "../components/question/ImmediateRequest.tsx";
import ModelSelector from '../components/ModelSelector.tsx';
import { useAgentEventState } from '../hooks/useAgentEventState.ts';
import { useAgentExecutionState } from '../hooks/useAgentExecutionState.ts';
import { useSidebar } from '../components/SidebarContext.tsx';
import { agentRPCClient, useAgent, useAvailableCommands, useCommandHistory } from "../rpc.ts";
import FileBrowserOverlay from '../components/ui/FileBrowserOverlay.tsx';



const getIcon = (msg: AgentEventEnvelope) => {
  switch (msg.type) {
    case 'agent.created':
      return <div className="w-[1em] h-[1em] rounded-full bg-emerald-500" />;
    case 'agent.stopped':
      return <div className="w-[1em] h-[1em] rounded-full bg-red-500" />;
    case 'output.info':
      return <Info className="w-[1em] text-blue-500/70 align-baseline" />;
    case 'output.warning':
      return <Info className="w-[1em] text-yellow-500/70 align-baseline" />;
    case 'output.error':
      return <Info className="w-[1em] text-red-500/70 align-baseline" />;
    case 'output.artifact':
      return <FileCode className="w-[1em] text-zinc-600 align-baseline" />;
    case 'output.chat':
      return <Bot className="w-[1em] text-zinc-500 align-baseline" />;
    case 'output.reasoning':
      return <Zap className="w-[1em] text-amber-500 align-baseline" />;
    case 'input.received':
      return <span className="text-indigo-500 font-bold">&gt;</span>;
    case 'input.handled':
      return <span className="text-green-500 font-bold">✓</span>;
    case 'question.request':
      return <span className="text-cyan-500 font-bold">?</span>;
    case 'question.response':
      return <span className="text-cyan-500 font-bold">!</span>;
    case 'reset':
      return <span className="text-purple-500 font-bold">↺</span>;
    case 'abort':
      return <Square className="w-[1em] text-red-500 align-baseline" />;
    default: {
      const foo: never = msg;
    }
  }
};

const getContentColor = (msg: AgentEventEnvelope) => {
  switch (msg.type) {
    case 'agent.created':
      return 'text-emerald-400 font-medium';
    case 'agent.stopped':
      return 'text-red-400 font-medium';
    case 'input.received':
      return 'text-zinc-100 font-medium';
    case 'input.handled':
      return 'text-green-400 font-medium';
    case 'output.chat':
      return 'text-zinc-300';
    case 'output.reasoning':
      return 'text-zinc-300 leading-relaxed';
    case 'output.warning':
      return 'text-yellow-400';
    case 'output.error':
      return 'text-red-400';
    case 'question.request':
      return 'text-cyan-300';
    case 'question.response':
      return 'text-cyan-400';
    case 'reset':
      return 'text-purple-400';
    case 'abort':
      return 'text-red-400 font-medium';
    case 'output.artifact':
      return 'text-blue-400';
    case 'output.info':
      return 'text-zinc-400';
    default: {
      const foo: never = msg;
    }
  }
};

const MessageComponent = ({ msg }: { msg: AgentEventEnvelope }) => {
  const containerVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: 'easeOut' as any },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`group flex items-start gap-4 px-6 py-2 transition-colors border-l-2 ${msg.type === 'input.received' ? 'bg-purple-800/20 border-purple-500/50' : 'hover:bg-zinc-700/30 border-transparent hover:border-zinc-600'
        }`}
    >
      <div className="h-lh items-center shrink-0 w-6 flex justify-center">
        {getIcon(msg)}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className={getContentColor(msg)}>
          {msg.type === 'output.artifact' ? (
            <ArtifactViewer artifact={msg} />
          ) : msg.type === 'output.reasoning' ? (
            <div className="prose prose-zinc-300 prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.message}
              </ReactMarkdown>
            </div>
          ) : msg.type === 'question.response' ? (
            <div className="max-w-none text-sm">
              <span className="text-zinc-500">Response: </span>
              <code className="bg-zinc-900 px-2 py-1 rounded text-zinc-200">{JSON.stringify(msg.result)}</code>
            </div>
          ) : msg.type === 'reset' ? (
            <div className="max-w-none text-sm">
              <span className="text-zinc-500">Reset: </span>
              {msg.what.join(', ')}
            </div>
          ) : msg.type === 'abort' ? (
            <div className="max-w-none text-sm">
              <span className="text-zinc-500">Aborted</span>
              {msg.reason && <span>: {msg.reason}</span>}
            </div>
          ) : msg.type === 'input.handled' ? (
            <div className="max-w-none text-sm">
              <span className="text-zinc-500">[{msg.status}]</span>
              {' '}{msg.message}
            </div>
          ) : ('message' in msg) ? (
            <div className="space-y-2 prose prose-zinc-300 prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.message}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>

      <span className="text-[10px] text-zinc-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none pt-1">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </motion.div>
  );
};

export default function ChatPage({ agentId }: { agentId: string }) {
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const { toggleMobileSidebar } = useSidebar();
  const agent = useAgent(agentId);
  const { messages } = useAgentEventState(agentId);
  const { idle, busyWith, statusLine, waitingOn } = useAgentExecutionState(agentId);
  const commandHistory = useCommandHistory(agentId);
  const availableCommands = useAvailableCommands(agentId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true); // Track state without triggering re-renders

  const filteredAvailableCommands = useMemo(() => {
    let ret: string[] = [];
    if (input.startsWith('/') && availableCommands.data) {
      ret = availableCommands.data.filter(cmd => cmd.toLowerCase().startsWith(input.slice(1).toLowerCase())).sort();
      if (ret.length === 0) {
        ret = ['help']
      } if (ret.length < 4) {
        ret.push(...ret.map(cmd => `help ${cmd}`));
      }
    }
    return ret;
  }, [availableCommands.data, input]);


  // 1. Monitor user scroll intent
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    // Is the user currently within 20px of the bottom?
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  };

  // 2. Observe content height changes specifically
  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // This fires whenever the message list grows (new messages or markdown streaming)
      if (isAtBottomRef.current && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'instant'
        });
      }
    });

    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const scrollToBottom = () => {
    isAtBottomRef.current = true;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setShowScrollButton(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !idle || !!waitingOn) return;
    const message = input;
    setInput('');
    await agentRPCClient.sendInput({ agentId: agentId, message });
    await commandHistory.mutate([...commandHistory.data!, message]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };



  return (
    <div className="h-full flex flex-col">
      <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-[#050505] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform"
          >
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium text-zinc-400">{agent.data?.config.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector agentId={agentId} />
        </div>
      </header>
      <div className="flex flex-col flex-1 overflow-hidden">
        <main
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-0 flex flex-col font-mono text-sm relative scroll-smooth bg-[#050505]"
        >
          {/* Added contentRef wrapper to accurately measure expansion */}
          <div ref={contentRef} className="flex flex-col min-h-full pb-4">
            <div className="h-4" />
            <div className="px-6 py-4 flex items-center gap-4 text-zinc-300 select-none">
              <div className="h-px bg-zinc-600 flex-1" />
              <span className="text-[10px] uppercase tracking-widest">Session Start • {new Date().toLocaleDateString()}</span>
              <div className="h-px bg-zinc-600 flex-1" />
            </div>

            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <MessageComponent key={i} msg={msg} />
              ))}
            </AnimatePresence>

            {busyWith && (
              <div className="flex items-center gap-4 px-6 py-2">
                <div className="mt-0.5 shrink-0 w-4 flex justify-center">
                  <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                </div>
                <div className="text-zinc-300 text-sm leading-relaxed">{busyWith}...</div>
              </div>
            )}
          </div>
        </main>

        <footer className="shrink-0 bg-zinc-900/80 border-t border-zinc-900 relative">
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={scrollToBottom}
                className="absolute left-1/2 -translate-x-1/2 -top-12 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors z-20 shadow-lg"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 transition-opacity" />

            <div className="flex items-start gap-4 px-6 py-4">
              <div className="shrink-0 h-lh items-center flex justify-center select-none text-lg">
                <span className="text-indigo-500 font-bold">&gt;</span>
              </div>

              <div className="flex-1 relative pt-0.75 flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!idle || !!waitingOn}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none h-16 md:h-24 text-sm font-mono text-zinc-200 placeholder-zinc-400 p-0 leading-relaxed outline-none disabled:opacity-50"
                  placeholder="Execute command or send message..."
                  spellCheck="false"
                />

                <AnimatePresence>
                  {filteredAvailableCommands.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-2 p-3 bg-zinc-900/80 border border-zinc-800 rounded-md shadow-lg z-20"
                    >
                      {filteredAvailableCommands.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => { setInput(`/${cmd} `) }}
                          className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-indigo-400 transition-colors cursor-pointer"
                        >
                          /{cmd}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex md:flex-row flex-col gap-2 sm:gap-3 pl-2 pb-1 pr-1 sm:pr-0 md:self-end self-start">
                  {idle ? (
                    <button className="p-1.5 sm:p-1 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800 sm:bg-transparent rounded sm:rounded-none" title="Send" onClick={() => handleSubmit()}>
                      <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  ) : (
                    <button className="p-1.5 sm:p-1 text-zinc-400 hover:text-red-400 transition-colors bg-zinc-800 sm:bg-transparent rounded sm:rounded-none" title="Abort"
                      onClick={() => agentRPCClient.abortAgent({ agentId, reason: "User abort" })}>
                      <Square className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}
                  <button
                    className="p-1.5 sm:p-1 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800 sm:bg-transparent rounded sm:rounded-none"
                    title="Attach Context"
                    onClick={() => setShowFileBrowser(true)}
                  >
                    <Paperclip className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Command History"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showHistory && commandHistory.data && commandHistory.data.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-zinc-900/95 border border-zinc-800 rounded-md shadow-lg z-30 max-h-64 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400 font-mono uppercase">Command History</span>
                    <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-zinc-300">
                      ×
                    </button>
                  </div>
                  <div className="space-y-1">
                    {commandHistory.data.slice().reverse().map((cmd, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(cmd); setShowHistory(false); }}
                        className="w-full text-left text-xs font-mono bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-zinc-300 transition-colors"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 bg-zinc-900/30 flex items-center justify-between px-2 select-none">
            <div className="flex items-center gap-4 px-4">
              <span className="text-[10px] text-zinc-400 font-mono line-clamp-1">{statusLine || 'Ready'}</span>
            </div>
            <div className="flex items-center gap-2 px-4">
              <div className={`w-1.5 h-1.5 ${idle ? 'bg-indigo-500' : 'bg-amber-500'} rounded-full animate-pulse`} />
              <span className={`text-[10px] ${idle ? 'text-indigo-400' : 'text-amber-400'} font-mono uppercase`}>{idle ? 'Online' : 'Busy'}</span>
            </div>
          </div>
        </footer>

        {waitingOn && <ImmediateRequest agentId={agentId} request={waitingOn} />}

        <FileBrowserOverlay
          agentId={agentId}
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
        />
      </div>
    </div>
  );
}