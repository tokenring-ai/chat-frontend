import { History, RotateCcw, Loader2, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { checkpointRPCClient, useAgentList, useCheckpointList } from '../rpc.ts';
import { toastManager } from './ui/toast.tsx';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

type CheckpointItem = { id: string; name: string; agentId: string; createdAt: number };

interface CheckpointBrowserProps {
  agents: ReturnType<typeof useAgentList>;
}

export default function CheckpointBrowser({ agents }: CheckpointBrowserProps) {
  const navigate = useNavigate();
  const checkpoints = useCheckpointList();
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const launchFromCheckpoint = async (checkpointId: string) => {
    setLaunchingId(checkpointId);
    try {
      const { agentId } = await checkpointRPCClient.launchAgentFromCheckpoint({ checkpointId, headless: false });
      await agents.mutate();
      navigate(`/agent/${agentId}`);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to launch from checkpoint', { duration: 5000 });
    } finally {
      setLaunchingId(null);
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sorted: CheckpointItem[] = useMemo(
    () => [...(checkpoints.data || [])].sort((a, b) => b.createdAt - a.createdAt),
    [checkpoints.data]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(cp => cp.name.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, CheckpointItem[]> = {};
    for (const cp of filtered) {
      const key = formatDate(cp.createdAt);
      (groups[key] ??= []).push(cp);
    }
    return groups;
  }, [filtered]);

  const selected = selectedId ? sorted.find(cp => cp.id === selectedId) ?? null : null;

  if (!checkpoints.data?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-500/90 uppercase tracking-widest flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Resume from Checkpoint
        </span>
        <span className="text-2xs text-muted">{checkpoints.data.length} saved</span>
      </div>

      <div className="bg-secondary border border-primary rounded-lg overflow-hidden">
        {/* Selector trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-hover transition-colors cursor-pointer focus-ring"
          aria-expanded={isOpen}
          aria-label="Select a checkpoint"
        >
          <History className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
          <div className="flex-1 min-w-0">
            {selected ? (
              <>
                <div className="text-sm font-medium text-primary truncate">{selected.name}</div>
                <div className="text-2xs text-muted mt-0.5">{formatTimeAgo(selected.createdAt)}</div>
              </>
            ) : (
              <span className="text-sm text-muted">Select a checkpoint...</span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Expandable dropdown list */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="border-t border-primary">
                {/* Search */}
                <div className="px-3 py-2 border-b border-primary">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Filter checkpoints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-input border border-primary rounded-lg py-1.5 pl-8 pr-8 text-xs text-primary placeholder-muted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Checkpoint list */}
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted">
                      No checkpoints matching "{searchQuery}"
                    </div>
                  ) : (
                    Object.entries(grouped).map(([date, items]) => {
                      const isCollapsed = collapsedGroups.has(date);
                      return (
                        <div key={date}>
                          {/* Date group header */}
                          <button
                            onClick={() => toggleGroup(date)}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold text-muted uppercase tracking-wider hover:bg-hover transition-colors cursor-pointer"
                          >
                            {isCollapsed
                              ? <ChevronRight className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                            }
                            <span>{date}</span>
                            <span className="text-2xs font-mono text-muted ml-auto">{items.length}</span>
                          </button>

                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="overflow-hidden"
                              >
                                {items.map(cp => (
                                  <button
                                    key={cp.id}
                                    onClick={() => {
                                      setSelectedId(cp.id === selectedId ? null : cp.id);
                                      setIsOpen(false);
                                      setSearchQuery('');
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                                      cp.id === selectedId
                                        ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                                        : 'hover:bg-hover border-l-2 border-transparent'
                                    }`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      cp.id === selectedId ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-tertiary'
                                    }`} />
                                    <span className={`flex-1 text-xs truncate ${
                                      cp.id === selectedId ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-primary'
                                    }`}>
                                      {cp.name}
                                    </span>
                                    <span className="text-2xs text-muted font-mono shrink-0">{formatTime(cp.createdAt)}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launch bar — visible when a checkpoint is selected */}
        {selected && !isOpen && (
          <div className="border-t border-primary px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xs text-muted min-w-0">
              <span className="truncate">{formatDate(selected.createdAt)} at {formatTime(selected.createdAt)}</span>
            </div>
            <button
              onClick={() => launchFromCheckpoint(selected.id)}
              disabled={launchingId === selected.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-button transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              aria-label={`Launch agent from checkpoint: ${selected.name}`}
            >
              {launchingId === selected.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5" />
              }
              Launch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
