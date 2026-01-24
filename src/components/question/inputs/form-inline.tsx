import { getDefaultQuestionValue, type ParsedFormQuestion, type ResultTypeForQuestion } from '@tokenring-ai/agent/question';
import { ChevronLeft, ChevronRight, X, Send } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import FileInlineQuestion from './file-inline.tsx';
import TreeInlineQuestion from './tree-inline.tsx';
import { agentRPCClient } from "../../../rpc.ts";

interface FormInlineProps {
  agentId: string;
  question: ParsedFormQuestion;
  requestId: string;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function FormInlineQuestion({ agentId, question, requestId, onClose, autoFocus = true }: FormInlineProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [currentField, setCurrentField] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const section = question.sections[currentSection];
  const fieldEntries = Object.entries(section.fields);
  const [fieldKey, field] = fieldEntries[currentField];
  const totalFields = fieldEntries.length;
  const isLastField = currentField === totalFields - 1;
  const isLastSection = currentSection === question.sections.length - 1;

  // Auto-focus on mount and field changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // Focus on input field when it's a text field
    if (field.type === 'text' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSection, currentField, field.type]);

  const handleFieldSubmit = async (value: any) => {
    setValues((prev) => ({ ...prev, [`${section.name}.${fieldKey}`]: value }));
    
    if (isLastField && isLastSection) {
      // Build final result
      const result: Record<string, Record<string, any>> = {};
      for (const sec of question.sections) {
        result[sec.name] = {};
        for (const key of Object.keys(sec.fields)) {
          result[sec.name][key] = values[`${sec.name}.${key}`];
        }
      }
      result[section.name][fieldKey] = value;
      
      setIsSubmitting(true);
      await agentRPCClient.sendQuestionResponse({
        agentId,
        requestId,
        response: { type: 'question.response', requestId, result, timestamp: Date.now() },
      });
      onClose();
    } else if (isLastField) {
      setCurrentSection(currentSection + 1);
      setCurrentField(0);
    } else {
      setCurrentField(currentField + 1);
    }
  };

  const handlePrevious = () => {
    if (currentField > 0) {
      setCurrentField(currentField - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setCurrentField(Object.keys(question.sections[currentSection - 1].fields).length - 1);
    }
  };

  const handleCancel = async () => {
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId,
      response: { type: 'question.response', requestId, result: getDefaultQuestionValue(question), timestamp: Date.now() },
    });
    onClose();
  };

  const canGoPrevious = currentSection > 0 || currentField > 0;
  const currentFieldValue = values[`${section.name}.${fieldKey}`];

  return (
    <div ref={containerRef} className="p-4 space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-xs" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="text-muted">
            Section {currentSection + 1} of {question.sections.length}
          </span>
          <span className="text-muted">·</span>
          <span className="text-muted">
            Field {currentField + 1} of {totalFields}
          </span>
        </div>
        <span className="text-accent font-medium">{section.name}</span>
      </div>

      {/* Description */}
      {section.description && (
        <p className="text-xs text-muted italic">{section.description}</p>
      )}

      {/* Field content */}
      <div className="min-h-[150px] flex flex-col">
        {field.type === 'text' && (
          <div className="flex-1 flex flex-col space-y-2">
            <label className="block text-sm text-primary" htmlFor={`form-field-${fieldKey}`}>
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-muted">{field.description}</p>}
            <input
              ref={inputRef}
              id={`form-field-${fieldKey}`}
              type={field.masked ? 'password' : 'text'}
              defaultValue={currentFieldValue || field.defaultValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (e.currentTarget.value) {
                    handleFieldSubmit(e.currentTarget.value);
                  }
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              className="w-full bg-primary border border-primary rounded-lg text-primary text-sm p-2.5 outline-none focus:border-accent transition-colors"
              aria-required={field.required}
            />
          </div>
        )}

        {field.type === 'treeSelect' && (
          <div className="flex-1 flex flex-col space-y-2 min-h-[150px]">
            <label className="block text-sm text-primary">{field.label}</label>
            <div className="border border-primary/50 rounded-lg flex-1 flex flex-col overflow-hidden">
              <TreeInlineQuestion
                question={field}
                agentId={agentId}
                requestId={requestId}
                onClose={() => handleFieldSubmit(null)}
                autoFocus={autoFocus}
              />
            </div>
          </div>
        )}

        {field.type === 'fileSelect' && (
          <div className="flex-1 flex flex-col space-y-2 min-h-[150px]">
            <label className="block text-sm text-primary">{field.label}</label>
            {field.description && <p className="text-xs text-muted">{field.description}</p>}
            <div className="border border-primary/50 rounded-lg flex-1 flex flex-col overflow-hidden">
              <FileInlineQuestion
                question={field}
                agentId={agentId}
                requestId={requestId}
                onClose={() => handleFieldSubmit(null)}
                autoFocus={autoFocus}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            <X size={14} />
            Cancel
          </button>
          {canGoPrevious && (
            <button
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors disabled:opacity-50 bg-tertiary px-2 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
          )}
        </div>
        {field.type === 'text' && (
          <button
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement;
              if (input?.value) handleFieldSubmit(input.value);
            }}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            {isLastField && isLastSection ? 'Submit' : 'Next'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
