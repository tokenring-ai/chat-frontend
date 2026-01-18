import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Cpu,
  FileCode,
  History,
  Info,
  Layers,
  Layout,
  PanelRight,
  Paperclip,
  Pause,
  Play,
  Settings,
  Trash2,
  User,
  Zap,
} from 'lucide-react';

const SCOPE_AGENTS = [
  { id: 'frontend', name: 'Frontend Engineer', icon: <Layout className="w-4 h-4" />, color: 'text-cyan-400' },
  { id: 'devops', name: 'DevOps Architect', icon: <Cpu className="w-4 h-4" />, color: 'text-orange-400' },
  { id: 'data', name: 'Data Scientist', icon: <Layers className="w-4 h-4" />, color: 'text-purple-400' },
];

const ACTIVE_AGENTS = [
  { id: '3dc8b517', name: 'Frontend Engineer', status: 'idle', uuid: '3dc8b517-f5e4-4d72-8f4c-30251c60fdc3' },
];

const WORKFLOWS = [
  { id: 1, name: 'All-Package Brainstorming Session', description: 'This agent will automatically run a brainstorming session for each package in the TokenRing monorepo' },
  { id: 2, name: 'All-Package Documentation Updater', description: 'This agent will automatically update the documentation for each package in the TokenRing monorepo' },
  { id: 3, name: 'All-Package Refactoring Agent', description: 'This agent will automatically analyze code and identify refactoring opportunities for each package in the TokenRing monorepo' },
  { id: 4, name: 'All-Package Unit Test Updater', description: 'This agent automatically updates unit tests for each package in the TokenRing monorepo' },
  { id: 5, name: 'All-Package Feature Brainstorm', description: 'This agent will automatically create BRAINSTORM.md files in each package directory' },
];

const NEW_AGENTS = [
  { id: 1, name: 'Coding Agent', description: 'A general code assistant that directly executes development tasks' },
  { id: 2, name: 'API Designer', description: 'Design and implement REST/GraphQL APIs and service contracts' },
  { id: 3, name: 'Auth System Designer', description: 'Design secure authentication and authorization systems' },
  { id: 4, name: 'Backend Developer', description: 'Implement server-side logic, business rules, and data processing' },
  { id: 5, name: 'Business Logic Engineer', description: 'Implement complex business workflows and rules engines' },
  { id: 6, name: 'Code Quality Engineer', description: 'Perform code quality reviews and refactoring' },
  { id: 7, name: 'Data Engineer', description: 'Implement data migrations, ETL pipelines, and data processing' },
  { id: 8, name: 'Database Designer', description: 'Design database schemas and implement data storage solutions' },
  { id: 9, name: 'Documentation Engineer', description: 'Create, maintain, and improve technical documentation' },
  { id: 10, name: 'DevOps Engineer', description: 'Set up deployment pipelines, infrastructure, and environments' },
  { id: 11, name: 'Frontend Engineer', description: 'Implement user interfaces, interactive components, and client-side functionality' },
  { id: 12, name: 'Full Stack Developer', description: 'Implement complete features across frontend and backend' },
];

const COMMANDS = ['/model', '/clear', '/agent', '/logs'];

const INITIAL_MESSAGES = [
  {
    id: 1,
    type: 'system',
    icon: 'dot',
    timestamp: '08:35:21',
    content: 'Agent Initialized',
    subtitle: 'Configuration loaded from frontend.config.json',
    status: 'success',
  },
  {
    id: 2,
    type: 'info',
    icon: 'info',
    timestamp: '08:35:21',
    content: 'Auto-selected model llamacpp:minimax/minimax-m2 for optimized latency.',
  },
  {
    id: 3,
    type: 'file',
    icon: 'file',
    timestamp: '08:35:22',
    content: 'Added context: .tokenring/knowledge/frontend.md',
  },
  {
    id: 4,
    type: 'command',
    timestamp: '08:45:31',
    content: '/model get',
    user: true,
  },
  {
    id: 5,
    type: 'response',
    icon: 'bot',
    timestamp: '08:45:31',
    content: 'Current model configuration:',
    code: {
      language: 'json',
      lines: [
        'provider: "llamacpp"',
        'model: "minimax/minimax-m2"',
        'ctx_window: 8192',
      ],
    },
  },
  {
    id: 6,
    type: 'command',
    timestamp: '08:46:12',
    content: 'Analyze the header component',
    user: true,
  },
  {
    id: 7,
    type: 'streaming',
    icon: 'zap',
    timestamp: '08:46:14',
    content: 'Scanning src/components/Header.tsx...',
    details: [
      'The useEffect hook lacks a dependency array.',
      'Unused import: Transition from headlessui.',
      'Hardcoded color values should use Tailwind variables.',
    ],
  },
];

const MessageComponent = ({ msg }) => {
  const getIcon = () => {
    if (msg.icon === 'dot') return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
    if (msg.icon === 'info') return <Info className="w-3.5 h-3.5 text-blue-500/70" />;
    if (msg.icon === 'file') return <FileCode className="w-3.5 h-3.5 text-zinc-600" />;
    if (msg.icon === 'bot') return <Bot className="w-3.5 h-3.5 text-zinc-500" />;
    if (msg.icon === 'zap') return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    return null;
  };

  const getContentColor = () => {
    if (msg.type === 'system') return 'text-emerald-400 font-medium';
    if (msg.type === 'command') return 'text-zinc-100 font-medium';
    if (msg.type === 'response') return 'text-zinc-300';
    if (msg.type === 'streaming') return 'text-zinc-300 leading-relaxed';
    return 'text-zinc-400';
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`group flex items-start gap-4 px-6 py-2 transition-colors border-l-2 ${
        msg.user ? 'bg-zinc-900/20 border-indigo-500/50' : 'hover:bg-zinc-900/30 border-transparent hover:border-zinc-800'
      }`}
    >
      <div className="mt-0.5 shrink-0 w-4 flex justify-center">
        {msg.user ? <span className="text-indigo-500 font-bold">➜</span> : getIcon()}
      </div>

      <div className="flex-1 space-y-2">
        <div className={getContentColor()}>{msg.content}</div>
        {msg.subtitle && <div className="text-zinc-400">{msg.subtitle}</div>}
        {msg.code && (
          <div className="bg-zinc-900/50 p-3 rounded-md border border-zinc-800/50 inline-block">
            <code className="text-xs text-zinc-400 block space-y-1">
              {msg.code.lines.map((line, i) => (
                <div key={i}>
                  <span className="text-purple-400">{line.split(':')[0]}</span>
                  {line.includes(':') && (
                    <>
                      : <span className="text-green-400">{line.split(': ')[1]}</span>
                    </>
                  )}
                </div>
              ))}
            </code>
          </div>
        )}
        {msg.details && (
          <ul className="list-disc list-outside ml-4 space-y-1 text-zinc-400">
            {msg.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
        )}
      </div>

      <span className="text-[10px] text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none pt-1">
        {msg.timestamp}
      </span>
    </motion.div>
  );
};

export default function MergedDesign() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [activeAgent, setActiveAgent] = useState(SCOPE_AGENTS[0]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newMessage = {
      id: Date.now(),
      type: inputValue.startsWith('/') ? 'command' : 'user',
      timestamp,
      content: inputValue,
      user: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 antialiased font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-80 border-r border-zinc-900 bg-[#050505] flex flex-col shrink-0 overflow-hidden">
        <div className="p-6 flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100 hidden md:block">TokenRing</h1>
        </div>

        <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
          {/* Scope Section */}
          <div>
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 px-3 hidden md:block">
              Scope
            </h2>
            <div className="space-y-1">
              {SCOPE_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all ${
                    activeAgent.id === agent.id
                      ? 'bg-zinc-900/50 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  <span className={activeAgent.id === agent.id ? agent.color : 'text-zinc-600'}>{agent.icon}</span>
                  <span className="text-sm font-medium hidden md:block">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Agents Section */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between px-2 mb-3">
              <h2 className="text-[10px] font-bold text-amber-600/90 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Active Agents
              </h2>
              <span className="text-[9px] text-zinc-500">{ACTIVE_AGENTS.length} running</span>
            </div>
            <div className="space-y-1">
              {ACTIVE_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="group flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-900/30 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-300 truncate">{agent.name}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">Agent is {agent.status}</div>
                  </div>
                  <button className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Workflows Section */}
          <div className="hidden md:block">
            <h2 className="text-[10px] font-bold text-blue-600/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Workflows
            </h2>
            <div className="space-y-1">
              {WORKFLOWS.slice(0, 3).map((workflow) => (
                <button
                  key={workflow.id}
                  className="flex items-start gap-3 px-3 py-2 rounded hover:bg-zinc-900/30 transition-colors text-left group w-full"
                >
                  <Play className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5 fill-current" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-300">{workflow.name}</div>
                    <div className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{workflow.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* New Agent Templates Section */}
          <div className="hidden md:block">
            <h2 className="text-[10px] font-bold text-indigo-600/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Agent Templates
            </h2>
            <div className="space-y-1">
              {NEW_AGENTS.slice(0, 4).map((agent) => (
                <button
                  key={agent.id}
                  className="flex items-start gap-3 px-3 py-2 rounded hover:bg-zinc-900/30 transition-colors text-left group w-full"
                >
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-300">{agent.name}</div>
                    <div className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{agent.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preferences Footer */}
        <div className="p-4 border-t border-zinc-900 shrink-0">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm hidden md:block">Preferences</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-[#050505] z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-sm font-semibold tracking-tight text-zinc-100">TokenRing</span>
              <span className="text-zinc-600 text-xs font-mono">/</span>
              <span className="text-xs font-medium text-zinc-400">{activeAgent.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900/50 transition-colors cursor-pointer group">
              <Cpu className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
              <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">llamacpp:minimax-m2</span>
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-0 flex flex-col font-mono text-sm relative scroll-smooth"
        >
          <div className="flex flex-col min-h-full pb-4">
            <div className="h-4" />

            {/* Session Marker */}
            <div className="px-6 py-4 flex items-center gap-4 text-zinc-700 select-none">
              <div className="h-px bg-zinc-900 flex-1" />
              <span className="text-[10px] uppercase tracking-widest">Session Start • Today 8:35 AM</span>
              <div className="h-px bg-zinc-900 flex-1" />
            </div>

            {/* Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <MessageComponent key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer / Input */}
        <footer className="shrink-0 bg-[#050505] border-t border-zinc-900">
          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 transition-opacity" />

            <div className="flex items-start gap-4 px-6 py-4">
              <div className="mt-1 shrink-0 w-4 flex justify-center select-none">
                <span className="text-indigo-500 font-bold">➜</span>
              </div>

              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none h-24 text-sm font-mono text-zinc-200 placeholder-zinc-700 p-0 leading-relaxed outline-none"
                  placeholder="Execute command or send message..."
                  spellCheck="false"
                />

                {/* Command Palette (Hover) */}
                <AnimatePresence>
                  {inputValue.startsWith('/') && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-0 right-0 mb-2 flex flex-wrap gap-2 p-3 bg-zinc-900/80 border border-zinc-800 rounded-md shadow-lg z-20"
                    >
                      {COMMANDS.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => setInputValue(cmd + ' ')}
                          className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-indigo-400 transition-colors cursor-pointer"
                        >
                          {cmd}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toolbar */}
                <div className="absolute bottom-0 right-0 flex items-center gap-3 bg-[#050505] pl-2 pb-1">
                  <button className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Attach Context">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Command History">
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-zinc-800" />
                  <span className="text-[10px] text-zinc-600 font-mono">CMD + ENTER</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="h-6 bg-zinc-900/30 flex items-center justify-between px-2 select-none">
            <div className="flex items-center gap-4 px-4">
              <span className="text-[10px] text-zinc-600 font-mono">Ln 42, Col 12</span>
              <span className="text-[10px] text-zinc-600 font-mono">UTF-8</span>
            </div>
            <div className="flex items-center gap-2 px-4">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-indigo-400 font-mono uppercase">Online</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
