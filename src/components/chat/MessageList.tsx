import type {RemoteAgentStatus} from "../../hooks/useAgentEventState.ts";
import MessageComponent from './MessageComponent.tsx';
import { useMemo, useRef, useEffect } from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import type {ChatMessage, InteractionResponseMessage} from '../../types/agent-events.ts';
import {isQuestionPromptMessage} from '../../types/agent-events.ts';

interface MessageListProps {
  messages: ChatMessage[];
  agentId: string;
  agentStatus: RemoteAgentStatus;
}

export default function MessageList({ messages, agentId, agentStatus }: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasInitializedRef = useRef(false);

  const questionResponses = useMemo(() => {
    const map = new Map<string, InteractionResponseMessage>();
    for (const msg of messages) {
      if (msg.type === 'input.interaction') {
        map.set(msg.interactionId, msg);
      }
    }
    return map;
  }, [messages]);

  const allItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'message' | 'busy'; data?: any; index?: number }> = [
      { type: 'header' }
    ];
    messages.forEach((msg, i) => {
      if (msg.type === 'input.interaction') return;
      items.push({ type: 'message', data: msg, index: i });
    });
    if (agentStatus.inputExecutionQueue.length > 0) {
      items.push({ type: 'busy', data: agentStatus.currentActivity });
    }
    return items;
  }, [messages, agentStatus.inputExecutionQueue.length, agentStatus.currentActivity]);

  // Scroll to bottom on initial mount when there are messages
  useEffect(() => {
    if (!hasInitializedRef.current && virtuosoRef.current && allItems.length > 1) {
      // Wait for the component to be rendered
      const timer = setTimeout(() => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: allItems.length - 1,
            align: 'end'
          });
          hasInitializedRef.current = true;
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [allItems.length]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={allItems}
      followOutput="smooth"
      initialTopMostItemIndex={allItems.length > 1 ? allItems.length - 1 : 0}
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
        const response = isQuestionPromptMessage(msg) ? questionResponses.get(msg.interactionId) : undefined;
        return (
          <MessageComponent
            msg={msg}
            agentId={agentId}
            response={response}
          />
        );
      }}
    />
  );
}
