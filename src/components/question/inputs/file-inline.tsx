import type { ParsedFileSelectQuestion, ResultTypeForQuestion } from "@tokenring-ai/agent/question";
import { File, Folder, ChevronDown, ChevronRight, X, Send, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { agentRPCClient, filesystemRPCClient } from "../../../rpc.ts";

interface FileInlineProps {
  question: ParsedFileSelectQuestion;
  agentId: string;
  requestId: string;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function FileInlineQuestion({
  question: { allowFiles, allowDirectories, minimumSelections, maximumSelections, defaultValue },
  agentId,
  requestId,
  onClose,
  autoFocus = true,
}: FileInlineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['.']));
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Map<string, string[]>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const multiple = maximumSelections !== 1;

  // Auto-focus on mount and scroll into view
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [autoFocus]);

  useEffect(() => {
    loadDirectory('.');
  }, []);

  const loadDirectory = async (path: string) => {
    if (files.has(path)) return;
    
    setLoading((prev) => new Set(prev).add(path));
    try {
      const result = await filesystemRPCClient.listDirectory({ path, showHidden: true, agentId, recursive: false });
      setFiles((prev) => new Map(prev).set(path, result.files));
    } catch (e) {
      setError('Failed to load directory');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  const toggleExpand = async (path: string) => {
    const isExpanded = expanded.has(path);
    if (isExpanded) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      setExpanded((prev) => new Set(prev).add(path));
      await loadDirectory(path);
    }
  };

  const toggleSelect = (path: string, isDir: boolean) => {
    const isSelectable = (isDir && allowDirectories) || (!isDir && allowFiles);
    if (!isSelectable) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        if (minimumSelections && next.size <= minimumSelections) {
          setError(`Minimum ${minimumSelections} required`);
          setTimeout(() => setError(null), 2000);
          return prev;
        }
        next.delete(path);
      } else {
        if (maximumSelections && next.size >= maximumSelections) {
          setError(`Maximum ${maximumSelections} allowed`);
          setTimeout(() => setError(null), 2000);
          return prev;
        }
        if (!multiple) next.clear();
        next.add(path);
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
    if (!isSelectionValid()) {
      setError('Selection is invalid');
      setTimeout(() => setError(null), 2000);
      return;
    }
    setIsSubmitting(true);
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId,
      response: { type: 'question.response', requestId, result: Array.from(selected), timestamp: Date.now() },
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

  const renderTree = (path: string, depth: number = 0): React.ReactNode[] => {
    const items = files.get(path) || [];
    const result: React.ReactNode[] = [];

    for (const item of items.sort((a, b) => {
      const aDir = a.endsWith('/');
      const bDir = b.endsWith('/');
      if (aDir && !bDir) return -1;
      if (!aDir && bDir) return 1;
      return a.localeCompare(b);
    })) {
      const isDir = item.endsWith('/');
      const cleanPath = isDir ? item.slice(0, -1) : item;
      const name = cleanPath.split('/').pop() || cleanPath;
      const isExpanded = expanded.has(cleanPath);
      const isLoading = loading.has(cleanPath);
      const isSelected = selected.has(item);
      const isSelectable = (isDir && allowDirectories) || (!isDir && allowFiles);

      result.push(
        <div
          key={item}
          role="treeitem"
          aria-expanded={isDir ? isExpanded : undefined}
          aria-selected={isSelected}
          className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors ${
            isSelected ? 'bg-accent/20' : 'hover:bg-hover'
          } ${!isSelectable ? 'opacity-40' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isDir) {
              toggleExpand(cleanPath);
            } else {
              toggleSelect(item, false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (isDir) {
                toggleExpand(cleanPath);
              } else {
                toggleSelect(item, false);
              }
            }
          }}
          tabIndex={isSelectable ? 0 : -1}
        >
          {isDir ? (
            <span className="text-warning shrink-0" aria-hidden="true">
              {isLoading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </span>
          ) : (
            <span className="w-[12px] shrink-0"></span>
          )}
          {isDir ? (
            <Folder size={14} className="text-warning shrink-0" aria-hidden="true" />
          ) : (
            <File size={14} className="text-primary shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm truncate">{name}</span>
          {isSelected && (
            <div className="ml-auto w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
          )}
        </div>
      );

      if (isDir && isExpanded && !isLoading) {
        result.push(...renderTree(cleanPath, depth + 1));
      }
    }

    return result;
  };

  return (
    <div ref={containerRef} className="p-3 space-y-3">
      <div
        role="tree"
        aria-label="File browser"
        className="max-h-[300px] overflow-y-auto custom-scrollbar border border-primary/50 rounded-lg bg-primary p-2"
      >
        {files.has('.') ? renderTree('.', 0) : (
          <div className="text-center text-muted text-sm py-8">Loading files...</div>
        )}
      </div>
      {error && <div className="text-error text-xs px-1" role="alert">{error}</div>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${isSelectionValid() ? 'text-primary' : 'text-error'}`} aria-live="polite">
            {selected.size} selected
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
            disabled={isSubmitting || !isSelectionValid()}
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
