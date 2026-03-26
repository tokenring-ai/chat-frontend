import {useEffect, useMemo, useRef} from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import type {RemoteAgentStatus} from "../../hooks/useAgentEventState.ts";
import type {ChatMessage, InteractionResponseMessage, QuestionPromptMessage} from '../../types/agent-events.ts';
import {isQuestionPromptMessage} from '../../types/agent-events.ts';
import MessageComponent from './MessageComponent.tsx';

interface MessageListProps {
  messages: ChatMessage[];
  agentId: string;
  agentStatus: RemoteAgentStatus;
}

type DisplayItem =
  | { type: 'header' }
  | { type: 'message'; data: ChatMessage }
  | { type: 'question-pair'; data: { question: QuestionPromptMessage; response: InteractionResponseMessage } }
  | { type: 'busy'; data?: string };

export default function MessageList({ messages, agentId, agentStatus }: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasInitializedRef = useRef(false);

  const displayItems = useMemo(() => {
    const items: DisplayItem[] = [{ type: 'header' }];
    const questionMap = new Map<string, QuestionPromptMessage>();

    for (const msg of messages) {
      if (isQuestionPromptMessage(msg)) {
        questionMap.set(msg.interactionId, msg);
      }
    }

    for (const msg of messages) {
      if (isQuestionPromptMessage(msg)) {
        // Pending questions are rendered above the input, not inline in the timeline.
        continue;
      }

      if (msg.type === 'input.interaction') {
        const question = questionMap.get(msg.interactionId);
        if (question) {
          items.push({
            type: 'question-pair',
            data: { question, response: msg }
          });
          continue;
        }
      }

      items.push({ type: 'message', data: msg });
    }

    if (agentStatus.inputExecutionQueue.length > 0) {
      items.push({ type: 'busy', data: agentStatus.currentActivity });
    }

    return items;
  }, [messages, agentStatus.inputExecutionQueue.length, agentStatus.currentActivity]);

  // Scroll to bottom on initial mount when there are messages
  useEffect(() => {
    if (!hasInitializedRef.current && virtuosoRef.current && displayItems.length > 1) {
      const timer = setTimeout(() => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: displayItems.length - 1,
            align: 'end'
          });
          hasInitializedRef.current = true;
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [displayItems.length]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={displayItems}
      followOutput="smooth"
      initialTopMostItemIndex={displayItems.length > 1 ? displayItems.length - 1 : 0}
      itemContent={(index, item) => {
        if (item.type === 'header') {
          const firstMessage = messages.find(m => !isQuestionPromptMessage(m) && m.type !== 'input.interaction');
          const hasMessages = displayItems.some(i => i.type === 'message' || i.type === 'question-pair');

          return (
            <>
              <div className="h-4" />
              <div className="px-6 py-4 flex items-center gap-4 text-zinc-700 dark:text-zinc-300 select-none">
                <div className="h-px bg-zinc-600 flex-1" />
                <span className="text-[10px] uppercase tracking-widest">
                  Session Start • {firstMessage?.timestamp ? new Date(firstMessage.timestamp).toLocaleDateString() : 'New Session'}
                </span>
                <div className="h-px bg-zinc-600 flex-1" />
              </div>
              {!hasMessages && (
                <div className="px-6 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4 shadow-lg">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                    Welcome to TokenRing
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-md mx-auto">
                    Start a conversation by typing a message below. Try <code
                    className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs">/help</code> to see available
                    commands.
                  </p>
                </div>
              )}
            </>
          );
        }
        if (item.type === 'busy') {
          return (
            <div className="flex items-center gap-5 px-6 py-3 my-2 animate-pulse">
              <div className="shrink-0 w-5 flex justify-center">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <div className="text-zinc-400 text-sm font-medium leading-relaxed">{item.data}...</div>
            </div>
          );
        }
        if (item.type === 'question-pair') {
          return (
            <MessageComponent
              msg={item.data.response}
              agentId={agentId}
              question={item.data.question}
              response={item.data.response}
            />
          );
        }

        return (
          <MessageComponent
            msg={item.data}
            agentId={agentId}
          />
        );
      }}
    />
  );
}
