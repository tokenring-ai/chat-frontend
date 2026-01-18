import type {ParsedFileSelectQuestion, ResultTypeForQuestion} from "@tokenring-ai/agent/question";
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { filesystemRPCClient } from '../../../rpc.ts';

interface FileSelectorProps {
  agentId: string;
  question: ParsedFileSelectQuestion;
  onSubmit: (selected: ResultTypeForQuestion<ParsedFileSelectQuestion>) => void;
}

export default function FileInputQuestion({
  agentId,
  question: {
    allowFiles,
    allowDirectories,
    minimumSelections,
    maximumSelections,
    defaultValue,
  },
  onSubmit,
}: FileSelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['.']));
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Map<string, string[]>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));
  const [error, setError] = useState<string | null>(null);

  const multiple = maximumSelections !== 1;

  useEffect(() => {
    loadDirectory('.');
  }, []);

  const loadDirectory = async (path: string) => {
    if (files.has(path)) return;
    
    setLoading(prev => new Set(prev).add(path));
    try {
      const result = await filesystemRPCClient.listDirectory({ path, showHidden: true, agentId, recursive: false });
      setFiles(prev => new Map(prev).set(path, result.files));
    } catch (e) {
      setError('Failed to load directory');
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  const toggleExpand = async (path: string) => {
    const isExpanded = expanded.has(path);
    if (isExpanded) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      setExpanded(prev => new Set(prev).add(path));
      await loadDirectory(path);
    }
  };

  const toggleSelect = (path: string, isDir: boolean) => {
    const isSelectable = (isDir && allowDirectories) || (!isDir && allowFiles);
    if (!isSelectable) return;

    setSelected(prev => {
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

  const handleSubmit = () => {
    if (minimumSelections && selected.size < minimumSelections) {
      setError(`Select at least ${minimumSelections}`);
      return;
    }
    onSubmit(Array.from(selected));
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
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-hover ${isSelected ? 'bg-active' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => isDir ? toggleExpand(cleanPath) : toggleSelect(item, false)}
        >
          {isDir && (
            <span className="text-warning">
              {isLoading ? '⏳' : isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {isDir ? <Folder size={16} className="text-warning" /> : <File size={16} className="text-primary" />}
          {multiple && isSelectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelect(item, isDir);
              }}
              className="accent-accent"
            />
          )}
          <span className={`text-sm ${!isSelectable ? 'text-muted' : 'text-primary'}`}>{name}</span>
        </div>
      );

      if (isDir && isExpanded && !isLoading) {
        result.push(...renderTree(cleanPath, depth + 1));
      }
    }

    return result;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2">
        {renderTree('.', 0)}
      </div>
      {error && <div className="px-4 py-2 text-error text-sm">{error}</div>}
      {multiple && (
        <div className="px-4 py-2 text-sm text-info border-t border-primary">
          Selected: {selected.size} {maximumSelections ? `/ ${maximumSelections}` : ''}
        </div>
      )}
      <div className="flex gap-2 p-4 border-t border-primary">
        <button onClick={() => onSubmit(null)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded text-primary">
          Cancel
        </button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-accent hover:bg-accent/80 rounded text-primary font-medium">
          Submit
        </button>
      </div>
    </div>
  );
}
