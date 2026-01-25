import type { AgentEventEnvelope } from '@tokenring-ai/agent/AgentEvents';
import { Bot, FileCode, Info, Square, Zap } from 'lucide-react';

export const getIcon = (msg: AgentEventEnvelope) => {
  switch (msg.type) {
    case 'agent.created':
      return <div className="w-[1em] h-[1em] mt-1 rounded-full bg-emerald-500" />;
    case 'agent.stopped':
      return <div className="w-[1em] h-[1em] mt-1 rounded-full bg-red-500" />;
    case 'output.info':
      return <Info className="w-[1em] text-blue-500/70" />;
    case 'output.warning':
      return <Info className="w-[1em] text-yellow-500/70" />;
    case 'output.error':
      return <Info className="w-[1em] text-red-500/70" />;
    case 'output.artifact':
      return <FileCode className="w-[1em] text-zinc-600" />;
    case 'output.chat':
      return <Bot className="w-[1em] text-zinc-500" />;
    case 'output.reasoning':
      return <Zap className="w-[1em] text-amber-500" />;
    case 'input.received':
      return <span className="text-indigo-500 font-bold flex items-center">&gt;</span>;
    case 'input.handled':
      return <span className="text-green-500 font-bold flex items-center">✓</span>;
    case 'question.request':
      return <span className="text-cyan-500 font-bold flex items-center">?</span>;
    case 'question.response':
      return <span className="text-cyan-500 font-bold flex items-center">!</span>;
    case 'reset':
      return <span className="text-purple-500 font-bold flex items-center">↺</span>;
    case 'abort':
      return <Square className="w-[1em] text-red-500" />;
    default: {
      const foo: never = msg;
    }
  }
};

export const getContentColor = (msg: AgentEventEnvelope) => {
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
      return 'text-zinc-300';
    case 'output.warning':
      return 'text-yellow-400';
    case 'output.error':
      return 'text-red-400';
    case 'question.request':
      return 'text-cyan-300';
    case 'question.response':
      return 'text-cyan-400 bg-zinc-900 px-2 py-1 rounded';
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
