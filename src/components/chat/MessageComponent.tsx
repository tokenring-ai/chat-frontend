import type { AgentEventEnvelope } from '@tokenring-ai/agent/AgentEvents';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import {Fragment, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ArtifactViewer from '../ArtifactViewer.tsx';
import InlineQuestion from '../question/InlineQuestion.tsx';
import { getIcon, getContentColor } from './messageUtils.tsx';

interface MessageComponentProps {
  msg: AgentEventEnvelope;
  agentId: string;
  hasResponse: boolean;
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
        msg.type === 'input.received' ? 'bg-purple-800/20 border-purple-500/50' : 'hover:bg-zinc-700/30 border-transparent hover:border-zinc-600'
      }`}
    >
      <div className="shrink-0 w-6 flex justify-center items-center prose prose-sm">
        {getIcon(msg)}
      </div>

      <div className={`prose prose-sm prose-invert ${getContentColor(msg)}`}>
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
        ) : null}

        <div className="flex flex-row items-center gap-3 pb-2 text-xs text-zinc-400 font-mono">
          {'message' in msg && msg.message && (
            <button
              onClick={handleCopy}
              className="cursor-pointer transition-colors"
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label={copied ? 'Message copied to clipboard' : 'Copy message to clipboard'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
          )}
          {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}
