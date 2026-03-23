import type {RemoteAgentStatus} from "../../hooks/useAgentEventState.ts";
import MessageComponent from './MessageComponent.tsx';
import { useMemo, useRef, useEffect } from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import type {ChatMessage, InteractionResponseMessage, QuestionPromptMessage} from '../../types/agent-events.ts';
import {isQuestionPromptMessage} from '../../types/agent-events.ts';

interface MessageListProps {
  messages: ChatMessage[];
  agentId: string;
  agentStatus: RemoteAgentStatus;
}

// Paired interaction for display
interface QuestionWithResponse {
  type: 'question-pair';
  question: QuestionPromptMessage;
  response?: InteractionResponseMessage;
}

export default function MessageList({ messages, agentId, agentStatus }: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasInitializedRef = useRef(false);

  // Build question-response pairs
  const displayItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'message' | 'question-pair' | 'busy'; data?: any; index?: number }> = [
      { type: 'header' }
    ];

    // First, build a map of interactionId -> response
    const responseMap = new Map<string, InteractionResponseMessage>();
    for (const msg of messages) {
      if (msg.type === 'input.interaction') {
        responseMap.set(msg.interactionId, msg);
      }
    }

    // Then process messages in order, pairing questions with responses
    for (const msg of messages) {
      if (isQuestionPromptMessage(msg)) {
        // Check if this question has been answered
        const response = responseMap.get(msg.interactionId);
        
        if (response) {
          // Question has been answered - show as a pair
          items.push({ 
            type: 'question-pair', 
            data: { question: msg, response } 
          });
        } else {
          // Question is still pending - don't show in stream (will be shown in PendingQuestions)
          // We skip unanswered questions from the stream
        }
      } else if (msg.type === 'input.interaction') {
        // Skip standalone responses - they're already shown with their questions
        continue;
      } else {
        // Regular message
        items.push({ type: 'message', data: msg, index: messages.indexOf(msg) });
      }
    }

    // Add busy indicator if agent is processing
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
        if (item.type === 'question-pair') {
          return (
            <MessageComponent
              msg={item.data.question}
              agentId={agentId}
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
