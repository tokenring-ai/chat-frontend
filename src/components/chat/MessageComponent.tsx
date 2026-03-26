import {type AgentEventEnvelope} from "@tokenring-ai/agent/AgentEvents";
import safeParseJSON from "@tokenring-ai/utility/json/safeParse";
import {motion} from 'framer-motion';
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  CircleSlash,
  Code,
  Copy,
  Download,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  Info,
  Layout,
  Square,
  Zap
} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {ChatMessage, InteractionResponseMessage, QuestionPromptMessage} from '../../types/agent-events.ts';
import AttachmentChip from './AttachmentChip';

const utf8decoder = new TextDecoder('utf-8');

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

interface MessageComponentProps {
  msg: ChatMessage;
  agentId: string;
  question?: QuestionPromptMessage;
  response?: InteractionResponseMessage;
}

interface EventConfig {
  style: string;
  icon: React.ReactNode;
}

const events: Record<ChatMessage['type'], EventConfig> = {
  'agent.created': {
    style: 'text-emerald-700 dark:text-emerald-400 font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-emerald-500" />,
  },
  'agent.stopped': {
    style: 'text-rose-800 dark:text-rose-400 font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-rose-500" />,
  },
  'agent.status': {
    style: 'text-blue-700 dark:text-blue-400',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-blue-500" />,
  },
  'agent.response': {
    style: 'text-emerald-700 dark:text-emerald-400 font-medium',
    icon: <span className="text-emerald-500 font-bold flex items-center">✓</span>,
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
    icon: <FileCode className="w-[1em] text-muted" />,
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
  'input.execution': {
    style: 'text-blue-700 dark:text-blue-400',
    icon: <Activity className="w-[1em] text-blue-500/70" />,
  },
  'input.interaction': {
    style: 'text-emerald-800 dark:text-emerald-300 font-medium',
    icon: <span className="text-emerald-500 font-bold flex items-center">❖</span>,
  },
  'cancel': {
    style: 'text-red-700 dark:text-red-400 font-medium',
    icon: <CircleSlash className="w-[1em] text-red-500" />,
  },
  'question': {
    style: 'text-cyan-800 dark:text-cyan-300',
    icon: <span className="text-cyan-500 font-bold flex items-center">?</span>,
  },
};

function getMessageText(msg: ChatMessage): string | null {
  switch (msg.type) {
    case 'input.received':
      return msg.input.message.trim() || '[empty message]';
    case 'question':
    case 'agent.created':
    case 'agent.stopped':
    case 'agent.response':
    case 'output.chat':
    case 'output.reasoning':
    case 'output.info':
    case 'output.warning':
    case 'output.error':
      return msg.message.trim() || '[empty message]';
    default:
      return null;
  }
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  className = className?.replace('language-', '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCopy();
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        onKeyDown={handleKeyDown}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity z-10 focus-ring"
        title="Copy code (Press Enter or Space)"
        aria-label="Copy code to clipboard"
        role="button"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted" />}
      </button>
      <pre className={`${className} bg-tertiary p-4 rounded-lg border border-primary shadow-sm`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function QuestionWithResponseDisplay({
  question,
  response
}: {
  question: QuestionPromptMessage;
  response?: InteractionResponseMessage;
}) {
  const formatResult = (result: unknown): string => {
    if (result === null || result === undefined) return "Cancelled";

    if (typeof result === 'string') return result;

    if (Array.isArray(result)) {
      if (result.length === 0) return "Nothing selected";
      if (result.length === 1) {
        const item = result[0];
        return typeof item === 'string' ? item : JSON.stringify(item);
      }
      return result.map(item => String(item)).join(', ');
    }

    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }

    return String(result);
  };

  return (
    <div className="not-prose font-medium">
      {/* Question part */}
      <div className="text-slate-800 dark:text-slate-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {question.message}
        </ReactMarkdown>
      </div>

      {/* Response part (if exists) */}
      {response && (
        <div className="py-3 text-emerald-700 dark:text-emerald-300">
              {formatResult(response.result)}
        </div>
      )}
    </div>
  );
}

function InteractionResponseDisplay({ msg }: { msg: InteractionResponseMessage }) {
  const result = msg.result;

  let displayText: string;

  if (result === null) {
    displayText = 'Cancelled';
  } else if (Array.isArray(result)) {
    if (result.length === 0) {
      displayText = 'Nothing selected';
    } else if (result.length === 1) {
      displayText = String(result[0]);
    } else {
      displayText = result.map(item => String(item)).join(', ');
    }
  } else if (typeof result === 'string') {
    displayText = result;
  } else if (typeof result === 'object') {
    displayText = JSON.stringify(result, null, 2);
  } else {
    displayText = String(result);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted font-mono">
        <span>Interaction ID:</span>
        <code className="bg-tertiary border border-primary px-1.5 py-0.5 rounded-md">{msg.interactionId}</code>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted font-mono">
        <span>Request ID:</span>
        <code className="bg-tertiary border border-primary px-1.5 py-0.5 rounded-md">{msg.requestId}</code>
      </div>
      <div className="mt-2 p-3 bg-secondary border border-primary rounded-lg">
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
          Response Result:
        </div>
        <div className="text-sm text-primary font-mono break-words whitespace-pre-wrap">
          {displayText}
        </div>
      </div>
    </div>
  );
}

function MessageFooter({ msg, onDownload }: { msg: ChatMessage; onDownload?: () => void }) {
  const [copied, setCopied] = useState(false);

  const messageText = getMessageText(msg);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(messageText!);
      } else {
        const ta = document.createElement('textarea');
        ta.value = messageText!;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCopy();
    }
  };

  return (
    <div className="not-prose flex flex-row items-center gap-3 pb-2 text-xs text-muted font-mono">
      {messageText && (
        <button
          type="button"
          onClick={handleCopy}
          onKeyDown={handleKeyDown}
          className="relative cursor-pointer transition-colors group focus-ring rounded-md flex items-center gap-1.5 hover:text-primary"
          title={copied ? 'Copied!' : 'Copy message to clipboard'}
          aria-label={copied ? 'Message copied to clipboard' : 'Copy message to clipboard'}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-emerald-600 text-white text-2xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-muted group-hover:text-primary"/>
            </>
          )}
        </button>
      )}
      {onDownload && (
        <button
          onClick={onDownload}
          className="cursor-pointer transition-colors focus-ring rounded-md"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-muted hover:text-primary" />
        </button>
      )}
      {formatTimestamp(msg.timestamp)}
    </div>
  );
}

export default function MessageComponent({msg, question, response}: MessageComponentProps) {
  const messageIcon = useMemo(() => {
    if (msg.type === 'output.artifact') {
      const mime = msg.mimeType;
      if (mime === 'text/x-diff') return <Code className="w-[1em] text-green-500" />;
      if (mime === 'text/markdown') return <FileText className="w-[1em] text-blue-500" />;
      if (mime === 'application/json') return <FileJson className="w-[1em] text-amber-500" />;
      if (mime === 'text/html') return <Layout className="w-[1em] text-orange-500" />;
      if (mime.startsWith('image/')) return <ImageIcon className="w-[1em] text-purple-500" />;
    }
    if (msg.type === 'agent.response') {
      if (msg.status === 'success') return <Check className="w-[1em] text-emerald-500" />;
      if (msg.status === 'cancelled') return <Square className="w-[1em] text-amber-500" />;
      return <Info className="w-[1em] text-red-500/70" />;
    }
    return events[msg.type].icon;
  }, [msg]);

  const messageStyle = useMemo(() => {
    if (msg.type !== 'agent.response') return events[msg.type].style;
    if (msg.status === 'success') return 'text-emerald-700 dark:text-emerald-400 font-medium';
    if (msg.status === 'cancelled') return 'text-amber-700 dark:text-amber-400 font-medium';
    return 'text-red-700 dark:text-red-400 font-medium';
  }, [msg]);

  const attachments = useMemo(() => {
    if (msg.type === 'input.received') return msg.input.attachments ?? [];
    if (msg.type === 'agent.response' && 'attachments' in msg) return msg.attachments ?? [];
    return [];
  }, [msg]);

  const messageText = getMessageText(msg);
  const hasAttachments = attachments.length > 0;
  const pairedQuestion = question ?? (msg.type === 'question' ? msg : undefined);
  const isQuestionWithResponse = Boolean(pairedQuestion && response);

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
          : isQuestionWithResponse
          ? 'bg-cyan-50/30 dark:bg-cyan-500/5 border-cyan-500/30'
          : msg.type === 'input.interaction'
          ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-500/30'
          : 'hover:bg-hover border-transparent hover:border-primary'
      }`}
    >
      <div className="shrink-0 w-6 flex justify-center items-center prose prose-sm">
        {isQuestionWithResponse ? (
          <span className="text-cyan-500 font-bold flex items-center">?</span>
        ) : messageIcon}
      </div>

      <div className={`prose prose-sm dark:prose-invert ${messageStyle} w-full`}>
        {msg.type === 'output.artifact' ? (
          <ArtifactDisplay artifact={msg} />
        ) : isQuestionWithResponse ? (
          <QuestionWithResponseDisplay
            question={pairedQuestion!}
            response={response}
          />
        ) : msg.type === 'input.interaction' ? (
          <InteractionResponseDisplay msg={msg as InteractionResponseMessage} />
        ) : messageText ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const text = String(children).trim();
                  if (text.includes("\n")) {
                    return <CodeBlock className={className}>{text}</CodeBlock>;
                  } else {
                    return <code className={className} {...props}>{text}</code>;
                  }
                }
              }}
            >
              {messageText}
            </ReactMarkdown>

            {hasAttachments && (
              <div className="not-prose mt-4 mb-2">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <AttachmentChip
                      key={`${attachment.name}-${attachment.timestamp}-${index}`}
                      attachment={attachment}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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
}

function ArtifactDisplay({ artifact }: { artifact: Extract<AgentEventEnvelope, { type: 'output.artifact' }> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mime = artifact.mimeType;

  const decodedBody = useMemo(() => {
    if (artifact.encoding === 'base64') return Uint8Array.fromBase64(artifact.body);
    return artifact.body;
  }, [artifact]);

  const textBody = typeof decodedBody === "string" ? decodedBody : utf8decoder.decode(decodedBody);

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
            <pre className="text-[11px] font-mono text-secondary bg-tertiary p-2 rounded-md overflow-x-auto border border-primary/20">
              {JSON.stringify(safeParseJSON(textBody, null), null, 2)}
            </pre>
          )}
          {mime === 'text/html' && (
            <div className="mt-2 border border-primary rounded-lg overflow-hidden shadow-sm">
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
                className="max-w-full rounded-lg border border-primary shadow-sm"
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
