import type {AgentEventEnvelope} from "@tokenring-ai/agent/AgentEvents";
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
import type React from 'react';
import {useMemo, useState} from 'react';
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
    style: 'text-success font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-success"/>,
  },
  'agent.stopped': {
    style: 'text-error font-medium',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-error"/>,
  },
  'agent.status': {
    style: 'text-accent',
    icon: <div className="w-[1em] h-[1em] mt-1 rounded-full bg-accent"/>,
  },
  'agent.response': {
    style: 'text-success font-medium',
    icon: <span className="text-success font-bold flex items-center">✓</span>,
  },
  'output.info': {
    style: 'text-secondary',
    icon: <Info className="w-[1em] text-accent/70"/>,
  },
  'output.warning': {
    style: 'text-warning',
    icon: <Info className="w-[1em] text-warning/70"/>,
  },
  'output.error': {
    style: 'text-error',
    icon: <Info className="w-[1em] text-error/70"/>,
  },
  'output.artifact': {
    style: 'text-accent',
    icon: <FileCode className="w-[1em] text-muted" />,
  },
  'output.chat': {
    style: 'text-primary',
    icon: <Bot className="w-[1em] text-muted" />,
  },
  'output.reasoning': {
    style: 'text-secondary italic',
    icon: <Zap className="w-[1em] text-warning"/>,
  },
  'input.received': {
    style: 'text-primary font-medium',
    icon: <span className="text-accent font-bold flex items-center">&gt;</span>,
  },
  'input.execution': {
    style: 'text-accent',
    icon: <Activity className="w-[1em] text-accent/70"/>,
  },
  'input.interaction': {
    style: 'text-success font-medium',
    icon: <span className="text-success font-bold flex items-center">❖</span>,
  },
  'cancel': {
    style: 'text-error font-medium',
    icon: <CircleSlash className="w-[1em] text-error"/>,
  },
  'question': {
    style: 'text-accent',
    icon: <span className="text-accent font-bold flex items-center">?</span>,
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

function getInputSource(msg: ChatMessage): string | null {
  if (msg.type === 'input.received' && msg.input.from) {
    return msg.input.from;
  }
  return null;
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') ?? '';

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
    <div className="not-prose my-3 rounded-lg overflow-hidden border border-stone-200 dark:border-neutral-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-stone-100 dark:bg-neutral-800 border-b border-stone-200 dark:border-neutral-700">
        <span className="text-[11px] font-mono text-stone-500 dark:text-neutral-400">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-neutral-700 transition-colors focus-ring"
          title="Copy code"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500"/> : <Copy className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500"/>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-stone-50 dark:bg-neutral-900 m-0">
        <code className="text-[13px] font-mono leading-relaxed text-stone-800 dark:text-neutral-200">{children}</code>
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
      <div className="text-primary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {question.message}
        </ReactMarkdown>
      </div>

      {/* Response part (if exists) */}
      {response && (
        <div className="py-3 text-success">
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
        <code className="bg-tertiary border border-primary px-1.5 py-0.5 rounded text-xs">{msg.interactionId}</code>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted font-mono">
        <span>Request ID:</span>
        <code className="bg-tertiary border border-primary px-1.5 py-0.5 rounded text-xs">{msg.requestId}</code>
      </div>
      <div className="mt-2 p-3 bg-secondary border border-primary rounded-lg">
        <div className="text-xs text-success font-medium mb-1">
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
              <Check className="w-3.5 h-3.5 text-success"/>
              <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-success text-primary text-2xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
      if (mime === 'text/x-diff') return <Code className="w-[1em] text-success"/>;
      if (mime === 'text/markdown') return <FileText className="w-[1em] text-accent"/>;
      if (mime === 'application/json') return <FileJson className="w-[1em] text-warning"/>;
      if (mime === 'text/html') return <Layout className="w-[1em] text-warning"/>;
      if (mime.startsWith('image/')) return <ImageIcon className="w-[1em] text-accent"/>;
    }
    if (msg.type === 'agent.response') {
      if (msg.status === 'success') return <Check className="w-[1em] text-success"/>;
      if (msg.status === 'cancelled') return <Square className="w-[1em] text-warning"/>;
      return <Info className="w-[1em] text-error/70"/>;
    }
    return events[msg.type].icon;
  }, [msg]);

  const messageStyle = useMemo(() => {
    if (msg.type !== 'agent.response') return events[msg.type].style;
    if (msg.status === 'success') return 'text-success font-medium';
    if (msg.status === 'cancelled') return 'text-warning font-medium';
    return 'text-error font-medium';
  }, [msg]);

  const attachments = useMemo(() => {
    if (msg.type === 'input.received') return msg.input.attachments ?? [];
    if (msg.type === 'agent.response' && 'attachments' in msg) return msg.attachments ?? [];
    return [];
  }, [msg]);

  const messageText = getMessageText(msg);
  const inputSource = getInputSource(msg);
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
            {/* Show 'from' field at the top for input.received messages */}
            {inputSource && (
              <div className="text-primary font-bold font-mono">
                From: {inputSource}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => <>{children}</>,
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
          <pre className="text-[11px] font-mono text-secondary bg-tertiary p-4 rounded-lg overflow-x-auto border border-primary shadow-md">
              {JSON.stringify(safeParseJSON(textBody, null), null, 2)}
            </pre>
          )}
          {mime === 'text/html' && (
            <div className="mt-2 border border-primary rounded-lg overflow-hidden shadow-md">
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
                className="max-w-full rounded-lg border border-primary shadow-md"
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
