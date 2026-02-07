import type { AgentEventEnvelope } from '@tokenring-ai/agent/AgentEvents';
import MessageComponent from './MessageComponent.tsx';
import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

interface MessageListProps {
  messages: AgentEventEnvelope[];
  agentId: string;
  busyWith?: string;
}

export default function MessageList({ messages, agentId, busyWith }: MessageListProps) {
  const answeredQuestions = useMemo(() => {
    const answered = new Set<string>();
    for (const msg of messages) {
      if (msg.type === 'question.response') {
        answered.add(msg.requestId);
      }
    }
    return answered;
  }, [messages]);

  const allItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'message' | 'busy'; data?: any; index?: number }> = [
      { type: 'header' }
    ];
    messages.forEach((msg, i) => {
      items.push({ type: 'message', data: msg, index: i });
    });
    if (busyWith) {
      items.push({ type: 'busy', data: busyWith });
    }
    return items;
  }, [messages, busyWith]);

  return (
    <Virtuoso
      data={allItems}
      followOutput="smooth"
      initialTopMostItemIndex={allItems.length - 1}
      itemContent={(index, item) => {
        if (item.type === 'header') {
          return (
            <>
              <div className="h-4" />
              <div className="px-6 py-4 flex items-center gap-4 text-zinc-300 select-none">
                <div className="h-px bg-zinc-600 flex-1" />
                <span className="text-[10px] uppercase tracking-widest">
                  Session Start • {messages[0]?.timestamp ? new Date(messages[0].timestamp).toLocaleDateString() : 'New Session'}
                </span>
                <div className="h-px bg-zinc-600 flex-1" />
              </div>
            </>
          );
        }
        if (item.type === 'busy') {
          return (
            <div className="flex items-center gap-4 px-6 py-2 animate-pulse">
              <div className="mt-0.5 shrink-0 w-4 flex justify-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <div className="text-zinc-300 text-sm leading-relaxed">{item.data}...</div>
            </div>
          );
        }
        const msg = item.data;
        return (
          <MessageComponent
            msg={msg}
            agentId={agentId}
            hasResponse={msg.type === 'question.request' ? answeredQuestions.has(msg.requestId) : false}
          />
        );
      }}
    />
  );
}
