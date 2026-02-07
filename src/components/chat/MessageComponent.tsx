import { type AgentEventEnvelope } from "@tokenring-ai/agent/AgentEvents";
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ArtifactViewer from '../ArtifactViewer.tsx';
import InlineQuestion from '../question/InlineQuestion.tsx';
import { Bot, FileCode, Info, Square, Zap } from 'lucide-react';

const MAX_MARKDOWN_LENGTH = 50_000 as const;

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

interface MessageComponentProps {
  msg: AgentEventEnvelope;
  agentId: string;
  hasResponse: boolean;
}

interface EventConfig {
  style: string;
  icon: React.ReactNode;
}

const events: Record<AgentEventEnvelope['type'], EventConfig> = {
  'agent.created': {
    style: 'text-emerald-700 dark:text-emerald-400 font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-emerald-500" />,
  },
  'agent.stopped': {
    style: 'text-rose-800 dark:text-rose-400 font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-rose-500" />,
  },
  'output.info': {
    style: 'text-muted',
    icon: <Info className="w-[1em] text-blue-500/70" />,
  },
  'output.warning': {
    style: 'text-amber-700 dark:text-amber-400',
    icon: <Info className="w-[1em] text-amber-500/70" />,
  },
  'output.error': {
    style: 'text-red-700 dark:text-red-400',
    icon: <Info className="w-[1em] text-red-500/70" />,
  },
  'output.artifact': {
    style: 'text-blue-700 dark:text-blue-400',
    icon: <FileCode className="w-[1em] text-muted" />,
  },
  'output.chat': {
    style: 'text-primary',
    icon: <Bot className="w-[1em] text-muted" />,
  },
  'output.reasoning': {
    style: 'text-muted italic',
    icon: <Zap className="w-[1em] text-amber-500" />,
  },
  'input.received': {
    style: 'text-indigo-900 dark:text-indigo-100 font-medium',
    icon: <span className="text-indigo-500 font-bold flex items-center">&gt;</span>,
  },
  'input.handled': {
    style: 'text-emerald-700 dark:text-emerald-400 font-medium',
    icon: <span className="text-emerald-500 font-bold flex items-center">✓</span>,
  },
  'question.request': {
    style: 'text-cyan-800 dark:text-cyan-300',
    icon: <span className="text-cyan-500 font-bold flex items-center">?</span>,
  },
  'question.response': {
    style: 'text-cyan-800 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-950/30 px-2 py-1 rounded border border-cyan-100 dark:border-cyan-900/50',
    icon: <span className="text-cyan-500 font-bold flex items-center">!</span>,
  },
  'reset': {
    style: 'text-purple-700 dark:text-purple-400',
    icon: <span className="text-purple-500 font-bold flex items-center">↺</span>,
  },
  'abort': {
    style: 'text-red-700 dark:text-red-400 font-medium',
    icon: <Square className="w-[1em] text-red-500" />,
  },
};

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-tertiary hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Copy code"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted" />}
      </button>
      <pre className={`${className} bg-secondary p-4 rounded-lg border border-primary`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function MessageComponent({ msg, agentId, hasResponse }: MessageComponentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if ('message' in msg && msg.message) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(msg.message);
        } else {
          // Fallback for browsers without clipboard API
          const textarea = document.createElement('textarea');
          textarea.value = msg.message;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -4 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as any } },
      }}
      initial="hidden"
      animate="visible"
      className={`group relative flex flex-row items-start gap-3 px-3 py-3 transition-colors border-l-2 ${
        msg.type === 'input.received' 
          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/50' 
          : 'hover:bg-hover border-transparent hover:border-primary'
      }`}
    >
      <div className="shrink-0 w-6 flex justify-center items-center prose prose-sm">
        {events[msg.type].icon}
      </div>

      <div className={`prose prose-sm dark:prose-invert ${events[msg.type].style}`}>
        {msg.type === 'output.artifact' ? (
          <p><ArtifactViewer artifact={msg} /></p>
        ) : msg.type === 'question.response' ? (
          <p>Response: {JSON.stringify(msg.result)}</p>
        ) : msg.type === 'reset' ? (
          <p>Reset: {msg.what.join(', ')}</p>
        ) : msg.type === 'abort' ? (
          <p>Aborted{msg.reason ? `: ${msg.reason}` : ''}</p>
        ) : msg.type === 'input.handled' ? (
          <p>[{msg.status}] {msg.message}</p>
        ) : msg.type === 'input.received' ? (
          <p>{msg.message}</p>
        ) : msg.type === 'question.request' && !hasResponse ? (
          <InlineQuestion request={msg} agentId={agentId} />
        ) : 'message' in msg ? (
          msg.message.length > MAX_MARKDOWN_LENGTH ? (
            <pre className="whitespace-pre-wrap break-words text-xs">{msg.message}</pre>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const content = String(children).replace(/\n$/, '');
                  return inline ? (
                    <code className={className} {...props}>{children}</code>
                  ) : (
                    <CodeBlock className={className}>{content}</CodeBlock>
                  );
                }
              }}
            >
              {msg.message}
            </ReactMarkdown>
          )
        ) : null}

        <div className="flex flex-row items-center gap-3 pb-2 text-xs text-primary font-mono">
          {'message' in msg && msg.message && (
            <button
              onClick={handleCopy}
              className="relative cursor-pointer transition-colors group"
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label={copied ? 'Message copied to clipboard' : 'Copy message to clipboard'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-2xs px-2 py-1 rounded whitespace-nowrap">
                    Copied!
                  </span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
              )}
            </button>
          )}
          {formatTimestamp(msg.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}
