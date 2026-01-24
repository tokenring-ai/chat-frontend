import type { ParsedTextQuestion, ResultTypeForQuestion } from "@tokenring-ai/agent/question";
import { X, Send } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { agentRPCClient } from "../../../rpc.ts";

interface TextInlineProps {
  question: ParsedTextQuestion;
  agentId: string;
  requestId: string;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function TextInlineQuestion({
  question: { label, required, defaultValue, expectedLines, masked },
  agentId,
  requestId,
  onClose,
  autoFocus = true,
}: TextInlineProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (required && !value.trim()) return;
    setIsSubmitting(true);
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId,
      response: { type: 'question.response', requestId, result: value, timestamp: Date.now() },
    });
    onClose();
  };

  const handleCancel = async () => {
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId,
      response: { type: 'question.response', requestId, result: null, timestamp: Date.now() },
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="p-4 space-y-3">
      {label && (
        <label className="block text-sm text-primary">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {expectedLines > 1 ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.min(expectedLines, 4)}
            style={masked ? { WebkitTextSecurity: 'disc' } as React.CSSProperties & { WebkitTextSecurity: string } : {}}
            placeholder={required ? "Required..." : "Optional..."}
            disabled={isSubmitting}
            className="w-full bg-primary border border-primary rounded-lg text-primary text-sm p-3 outline-none focus:border-accent transition-colors resize-none disabled:opacity-50"
            aria-required={required}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            type={masked ? 'password' : 'text'}
            placeholder={required ? "Required..." : "Optional..."}
            disabled={isSubmitting}
            className="w-full bg-primary border border-primary rounded-lg text-primary text-sm p-2.5 outline-none focus:border-accent transition-colors disabled:opacity-50"
            aria-required={required}
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (required && !value.trim())}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
        >
          {isSubmitting ? 'Sending...' : 'Submit'}
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
