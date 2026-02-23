import {type ParsedQuestionRequest, type QuestionResponse} from "@tokenring-ai/agent/AgentEvents";
import { ChevronDown } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FileInlineQuestion from "./inputs/file-inline.tsx";
import FormInlineQuestion from "./inputs/form-inline.tsx";
import TextInlineQuestion from "./inputs/text-inline.tsx";
import TreeInlineQuestion from "./inputs/tree-inline.tsx";

interface InlineQuestionProps {
  request: ParsedQuestionRequest;
  agentId: string;
  response?: QuestionResponse;
}

function formatResponseResult(result: any) {
  if (result === null) return "Cancelled";

  if (Array.isArray(result)) {
    if (result.length === 0) return "Nothing selected";
    if (result.length === 1) result = result[0]
  }

  if (typeof result === "string") return `Response: ${result}`;
  return `Response: ${JSON.stringify(result.result)}`;
}

export default function InlineQuestion({ request, agentId, response }: InlineQuestionProps) {
  const [isExpanded, setIsExpanded] = useState(!response);
  const [countdown, setCountdown] = useState<number | null>(null);
  const question = request.question;
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);

  // Focus on the header when the question is rendered
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (request.autoSubmitAfter <= 0) return;

    const updateCountdown = () => {
      const deadline = request.timestamp + request.autoSubmitAfter * 1000;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [request.timestamp, request.autoSubmitAfter]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
      headerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="not-prose mb-2" role="region" aria-labelledby={`question-title-${request.requestId}`}>
      {/* Header - always visible */}
      <button
        ref={headerRef}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex items-center gap-2 py-0.5 w-full text-left cursor-pointer group/header hover:opacity-80 transition-opacity"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`question-content-${request.requestId}`}
        id={`question-title-${request.requestId}`}
      >
        <div className={`transition-transform duration-150 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDown size={14} className="text-dim" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-primary truncate leading-none">
            {request.message}
          </span>
          <span className="text-[10px] font-mono text-dim opacity-0 group-hover/header:opacity-100 transition-opacity leading-none pt-0.5">
            {question.type}
          </span>
          {countdown !== null && countdown > 0 && (
            <span className="text-[10px] text-accent font-medium leading-none pt-0.5">
              {countdown}s
            </span>
          )}
        </div>
      </button>

      {/* Content - expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            id={`question-content-${request.requestId}`}
            className="ml-1.5 mt-2 border-l border-primary/40 pl-4 py-1"
            role="region"
            aria-labelledby={`question-title-${request.requestId}`}
            onKeyDown={handleKeyDown}
          >
          {question.type === 'treeSelect' && (
            <TreeInlineQuestion
              question={question}
              agentId={agentId}
              requestId={request.requestId}
              onClose={() => setIsExpanded(false)}
            />
          )}
          {question.type === 'text' && (
            <TextInlineQuestion
              question={question}
              agentId={agentId}
              requestId={request.requestId}
              onClose={() => setIsExpanded(false)}
            />
          )}
          {question.type === 'fileSelect' && (
            <FileInlineQuestion
              question={question}
              agentId={agentId}
              requestId={request.requestId}
              onClose={() => setIsExpanded(false)}
            />
          )}
          {question.type === 'form' && (
            <FormInlineQuestion
              question={question}
              agentId={agentId}
              requestId={request.requestId}
              onClose={() => setIsExpanded(false)}
            />
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {response && (
        <span className="text-muted truncate">
          {formatResponseResult(response.result)}
        </span>
      )}
    </div>
  );
}
