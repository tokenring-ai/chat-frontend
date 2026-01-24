import type { ParsedTreeSelectQuestion, ResultTypeForQuestion, TreeLeaf } from '@tokenring-ai/agent/question';
import { Check, ChevronDown, ChevronRight, X, Send } from 'lucide-react';
import React, { useState, Fragment, useRef, useEffect } from 'react';
import { agentRPCClient } from "../../../rpc.ts";

interface TreeInlineProps {
  question: ParsedTreeSelectQuestion;
  agentId: string;
  requestId: string;
  onClose: () => void;
  autoFocus?: boolean;
}

const CompactTreeNode: React.FC<{
  node: TreeLeaf;
  depth: number;
  selected: Set<string>;
  onToggle: (value: string) => void;
  onExpand: () => void;
  isExpanded: boolean;
  multiple: boolean;
  canSelect: (value: string) => boolean;
  isFirstNode?: boolean;
}> = ({ node, depth, selected, onToggle, onExpand, isExpanded, multiple, canSelect, isFirstNode }) => {
  const value = node.value || node.name;
  const isSelected = selected.has(value);
  const hasChildren = !!node.children && node.children.length > 0;
  const isSelectable = !hasChildren || multiple;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && !multiple) {
      onExpand();
    } else if (canSelect(value)) {
      onToggle(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasChildren && !multiple) {
        onExpand();
      } else if (canSelect(value)) {
        onToggle(value);
      }
    } else if (e.key === 'ArrowRight' && !isExpanded && hasChildren) {
      e.preventDefault();
      onExpand();
    } else if (e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault();
      onExpand();
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand();
  };

  return (
    <div className="flex flex-col">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={isSelectable ? 0 : -1}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] ${
          isSelected ? 'bg-accent/20' : 'hover:bg-hover'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {hasChildren ? (
          <span
            onClick={handleExpandClick}
            className="text-tertiary hover:text-primary transition-colors"
            aria-hidden="true"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-[12px]" aria-hidden="true"></span>
        )}
        <span className={`text-sm ${isSelected ? 'text-accent font-medium' : 'text-primary'}`}>
          {node.name}
        </span>
        {isSelected && (
          <Check size={14} className="text-accent ml-auto" aria-hidden="true" />
        )}
      </div>
      {isExpanded && hasChildren && (
        <div role="group">
          {node.children!.map((child, idx) => (
            <CompactTreeNode
              key={idx}
              node={child}
              depth={depth + 1}
              selected={selected}
              onToggle={onToggle}
              onExpand={() => {}}
              isExpanded={false}
              multiple={multiple}
              canSelect={canSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function TreeInlineQuestion({ question, agentId, requestId, onClose, autoFocus = true }: TreeInlineProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(question.defaultValue ?? []));
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([0]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { minimumSelections, maximumSelections } = question;
  const multiple = maximumSelections !== 1;

  // Auto-focus on mount and scroll into view
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [autoFocus]);

  const canSelect = (value: string): boolean => {
    if (!multiple) return true;
    const isCurrentlySelected = selected.has(value);
    if (isCurrentlySelected) {
      return minimumSelections === undefined || selected.size > minimumSelections;
    }
    return maximumSelections === undefined || selected.size < maximumSelections;
  };

  const handleToggle = (value: string) => {
    if (!canSelect(value)) return;
    
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (!multiple) next.clear();
        next.add(value);
      }
      return next;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const isSelectionValid = () => {
    const count = selected.size;
    if (minimumSelections !== undefined && count < minimumSelections) return false;
    if (maximumSelections !== undefined && count > maximumSelections) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isSelectionValid()) return;
    setIsSubmitting(true);
    const values = Array.from(selected);
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId,
      response: { type: 'question.response', requestId, result: values.length > 0 ? values : null, timestamp: Date.now() },
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

  const selectionCount = selected.size;
  const isValid = isSelectionValid();

  return (
    <div ref={containerRef} className="p-3 space-y-3">
      <div
        role="tree"
        aria-label="Select from tree"
        className="max-h-[300px] overflow-y-auto custom-scrollbar border border-primary/50 rounded-lg bg-primary"
      >
        {question.tree.map((root, index) => (
          <CompactTreeNode
            key={index}
            node={root}
            depth={0}
            selected={selected}
            onToggle={handleToggle}
            onExpand={() => toggleExpand(index)}
            isExpanded={expandedNodes.has(index)}
            multiple={multiple}
            canSelect={canSelect}
            isFirstNode={index === 0}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${isValid ? 'text-primary' : 'text-error'}`} aria-live="polite">
            {selectionCount} selected
          </span>
          {(minimumSelections !== undefined || maximumSelections !== undefined) && (
            <span className="text-xs text-muted">
              {minimumSelections !== undefined && `min ${minimumSelections}`}
              {minimumSelections !== undefined && maximumSelections !== undefined && ' · '}
              {maximumSelections !== undefined && `max ${maximumSelections}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            disabled={isSubmitting || !isValid}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            {isSubmitting ? 'Sending...' : 'Submit'}
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
