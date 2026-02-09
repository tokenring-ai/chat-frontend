import {type AgentEventEnvelope, type QuestionResponse} from "@tokenring-ai/agent/AgentEvents";
import { motion } from 'framer-motion';
import { Check, Copy, ChevronDown, Code, FileText, FileJson, Image as ImageIcon, Layout, Download } from 'lucide-react';
import React, {useState, useMemo} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InlineQuestion from '../question/InlineQuestion.tsx';
import { Bot, FileCode, Info, Square, Zap } from 'lucide-react';

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
  response?: QuestionResponse;
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
    style: 'text-secondary',
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
    icon: <FileCode className="w-[1em] text-muted" />, // This will be overridden dynamically
  },
  'output.chat': {
    style: 'text-primary',
    icon: <Bot className="w-[1em] text-muted" />,
  },
  'output.reasoning': {
    style: 'text-secondary italic',
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
  className?.replace('language-', '');

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
        className="absolute top-2 right-2 p-1.5 rounded bg-secondary hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity z-10 focus-ring"
        title="Copy code"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted" />}
      </button>
      <pre className={`${className} bg-tertiary p-4 rounded-lg border border-primary`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function MessageFooter({ msg, onDownload }: { msg: AgentEventEnvelope; onDownload?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if ('message' in msg && msg.message) {
      try {
        await navigator.clipboard.writeText(msg.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="flex flex-row items-center gap-3 pb-2 text-xs text-primary font-mono">
      {'message' in msg && msg.message && (
        <button
          onClick={handleCopy}
          className="relative cursor-pointer transition-colors group focus-ring rounded"
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
      {onDownload && (
        <button
          onClick={onDownload}
          className="cursor-pointer transition-colors focus-ring rounded"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-muted hover:text-primary" />
        </button>
      )}
      {formatTimestamp(msg.timestamp)}
    </div>
  );
}

export default function MessageComponent({ msg, agentId, response }: MessageComponentProps) {
  // Get artifact-specific icon if this is an artifact message
  const messageIcon = useMemo(() => {
    if (msg.type === 'output.artifact') {
      const mime = msg.mimeType;
      if (mime === 'text/x-diff') return <Code className="w-[1em] text-green-500" />;
      if (mime === 'text/markdown') return <FileText className="w-[1em] text-blue-500" />;
      if (mime === 'application/json') return <FileJson className="w-[1em] text-amber-500" />;
      if (mime === 'text/html') return <Layout className="w-[1em] text-orange-500" />;
      if (mime.startsWith('image/')) return <ImageIcon className="w-[1em] text-purple-500" />;
    }
    return events[msg.type].icon;
  }, [msg]);

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
        {messageIcon}
      </div>

      <div className={`prose prose-sm dark:prose-invert ${events[msg.type].style}`}>
        {msg.type === 'output.artifact' ? (
          <ArtifactDisplay artifact={msg} />
        ) : msg.type === 'reset' ? (
          <p>Reset: {msg.what.join(', ')}</p>
        ) : msg.type === 'abort' ? (
          <p>Aborted{msg.reason ? `: ${msg.reason}` : ''}</p>
        ) : msg.type === 'input.handled' ? (
          <p>[{msg.status}] {msg.message}</p>
        ) : msg.type === 'input.received' ? (
          <p>{msg.message}</p>
        ) : msg.type === 'question.request' ? (
          <InlineQuestion request={msg} agentId={agentId} response={response} />
        ) : 'message' in msg ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, className, children, ...props }) => {
                const text = String(children).trim();
                if (text.includes("\n")) { // Multi-line code block
                  return <CodeBlock className={className}>{text}</CodeBlock>;
                } else {
                  return <code className={className} {...props}>{text}</code>;
                }
              }
            }}
          >
            {msg.message}
          </ReactMarkdown>
        ) : null}

        <MessageFooter 
          msg={msg} 
          onDownload={msg.type === 'output.artifact' ? () => {
            const decodedBody = msg.encoding === 'base64' ? Buffer.from(msg.body, 'base64') : msg.body;
            const blob = new Blob([decodedBody], { type: msg.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = msg.name;
            a.click();
            URL.revokeObjectURL(url);
          } : undefined}
        />
      </div>
    </motion.div>
  );
}// ... existing code ...
function ArtifactDisplay({ artifact }: { artifact: Extract<AgentEventEnvelope, { type: 'output.artifact' }> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mime = artifact.mimeType;

  const decodedBody = useMemo(() => {
    if (artifact.encoding === 'base64') return Buffer.from(artifact.body, 'base64');
    return artifact.body;
  }, [artifact]);

  const textBody = typeof decodedBody === "string" ? decodedBody : decodedBody.toString("utf-8");

  // Get summary based on mime type
  const summary = useMemo(() => {
    if (mime === 'text/x-diff') {
      const lines = textBody.split('\n');
      const added = lines.filter(l => l.startsWith('+')).length;
      const removed = lines.filter(l => l.startsWith('-')).length;
      return `+${added} -${removed} lines`;
    }
    if (mime === 'text/markdown') return `${textBody.length} chars`;
    if (mime === 'application/json') return 'JSON';
    if (mime === 'text/html') return 'HTML';
    if (mime.startsWith('image/')) return mime.split('/')[1].toUpperCase();
    return mime;
  }, [mime, textBody]);

  return (
    <div className="not-prose mb-2">
      <button
        className="flex items-center gap-2 py-0.5 w-full text-left cursor-pointer group/header hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`transition-transform duration-150 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDown size={14} className="text-dim" />
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-medium text-primary truncate leading-none">{artifact.name}</span>
          <span className="text-[10px] font-mono text-dim opacity-0 group-hover/header:opacity-100 transition-opacity leading-none pt-0.5">
                {summary}
              </span>
        </div>
      </button>

      {isExpanded && (
        <div className="ml-1.5 mt-2 border-l border-primary/40 pl-4 py-1">
           {mime === 'text/x-diff' && (
            <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
              {textBody.split('\n').map((line, i) => (
                <div key={i} className={`whitespace-pre px-1 ${
                  line.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' :
                    line.startsWith('-') ? 'text-rose-600 dark:text-rose-400' :
                      'text-muted'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          )}
          {mime === 'text/markdown' && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{textBody}</ReactMarkdown>
            </div>
          )}
          {mime === 'application/json' && (
            <pre className="text-[11px] font-mono text-secondary bg-tertiary/20 p-2 rounded-md overflow-x-auto">
                  {JSON.stringify(JSON.parse(textBody), null, 2)}
                </pre>
          )}
          {mime === 'text/html' && (
            <div className="mt-2 border border-primary rounded-lg overflow-hidden">
              <iframe
                srcDoc={textBody}
                className="w-full h-80 bg-white"
                sandbox="allow-scripts"
              />
            </div>
          )}
          {mime.startsWith('image/') && (
            <div className="mt-2">
              <img
                src={URL.createObjectURL(new Blob([decodedBody], { type: mime }))}
                alt={artifact.name}
                className="max-w-full rounded border border-primary"
              />
            </div>
          )}
          {!['text/x-diff', 'text/markdown', 'application/json', 'text/html'].includes(mime) && !mime.startsWith('image/') && (
            <pre className="text-[11px] font-mono text-secondary whitespace-pre-wrap">
              {textBody}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}