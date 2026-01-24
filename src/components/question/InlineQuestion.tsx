import { type ParsedQuestionRequest } from "@tokenring-ai/agent/AgentEvents";
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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
  const question = request.question;
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Focus on the header when the question is rendered
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

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
          <span className="text-[10px] text-muted uppercase font-medium">
            {question.type}
          </span>
          {isExpanded ? (
            <ChevronDown size={14} className="text-tertiary" aria-hidden="true" />
          ) : (
            <ChevronRight size={14} className="text-tertiary" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Content - expandable */}
      {isExpanded && (
        <div
          id={`question-content-${request.requestId}`}
          className="border-t border-primary"
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
        </div>
      )}
    </div>
  );
}
