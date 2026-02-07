import { type ParsedQuestionRequest } from "@tokenring-ai/agent/AgentEvents";
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FileInlineQuestion from "./inputs/file-inline.tsx";
import FormInlineQuestion from "./inputs/form-inline.tsx";
import TextInlineQuestion from "./inputs/text-inline.tsx";
import TreeInlineQuestion from "./inputs/tree-inline.tsx";

interface InlineQuestionProps {
  request: ParsedQuestionRequest;
  agentId: string;
}

export default function InlineQuestion({ request, agentId }: InlineQuestionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const question = request.question;
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="mt-3 border border-primary rounded-lg overflow-hidden bg-secondary/50" role="region" aria-labelledby={`question-title-${request.requestId}`}>
      {/* Header - always visible */}
      <div
        ref={headerRef}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`question-content-${request.requestId}`}
        id={`question-title-${request.requestId}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm font-medium">
            {request.message || 'Please provide input'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {countdown !== null && countdown > 0 && (
            <span className="text-[10px] text-accent font-medium">
              {countdown}s
            </span>
          )}
          <span className="text-[10px] text-muted uppercase font-medium">
            {question.type}
          </span>
          {isExpanded ? (
            <ChevronDown size={14} className="text-muted" aria-hidden="true" />
          ) : (
            <ChevronRight size={14} className="text-muted" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Content - expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            id={`question-content-${request.requestId}`}
            className="border-t border-primary overflow-hidden"
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
    </div>
  );
}
