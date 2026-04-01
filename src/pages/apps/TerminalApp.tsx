import { Bot, ChevronRight, Cpu, Loader2, Plus, Terminal, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils.ts';
import { agentRPCClient, terminalRPCClient, useAgentList, useTerminalList } from '../../rpc.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

type TerminalSummary = {
  name: string;
  command: string;
  providerName: string;
  workingDirectory: string;
  startTime: number;
  running: boolean;
  outputLength: number;
  exitCode?: number | null;
  connectedAgentIds: string[];
};

// ─── SpawnDialog ──────────────────────────────────────────────────────────────

interface SpawnDialogProps {
  onSpawn: (command: string, workingDirectory: string) => void;
  onCancel: () => void;
  spawning: boolean;
}

function SpawnDialog({ onSpawn, onCancel, spawning }: SpawnDialogProps) {
  const [command, setCommand] = useState('/bin/bash');
  const [workingDir, setWorkingDir] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawn(command.trim() || '/bin/bash', workingDir.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-6"
      >
        <h2 className="text-sm font-semibold text-gray-200 font-mono mb-5">New Terminal Session</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1.5">Command</label>
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono outline-none focus:border-green-700 focus:ring-1 focus:ring-green-800/50"
              placeholder="/bin/bash"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1.5">Working Directory (optional)</label>
            <input
              type="text"
              value={workingDir}
              onChange={e => setWorkingDir(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono outline-none focus:border-green-700 focus:ring-1 focus:ring-green-800/50"
              placeholder="default"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            disabled={spawning}
            className="flex items-center gap-2 px-4 py-2 bg-green-900/40 hover:bg-green-900/60 border border-green-800/60 text-green-400 font-mono text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {spawning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Spawn
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-500 hover:text-gray-300 font-mono text-sm rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── AttachAgentDialog ────────────────────────────────────────────────────────

interface AttachAgentDialogProps {
  terminalName: string;
  connectedAgentIds: string[];
  onClose: () => void;
  onAttached: () => void;
}

function AttachAgentDialog({ terminalName, connectedAgentIds, onClose, onAttached }: AttachAgentDialogProps) {
  const navigate = useNavigate();
  const agents = useAgentList();
  const [attaching, setAttaching] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const freeAgents = (agents.data ?? []).filter(a => !connectedAgentIds.includes(a.id));

  const handleAttachExisting = async (agentId: string) => {
    setAttaching(agentId);
    try {
      await terminalRPCClient.attachTerminal({ agentId, terminalName });
      onAttached();
    } catch (e: any) {
      console.error('Failed to attach agent:', e);
    } finally {
      setAttaching(null);
    }
  };

  const handleLaunchNew = async () => {
    setLaunching(true);
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: 'terminal', headless: false });
      await terminalRPCClient.attachTerminal({ agentId: id, terminalName });
      onClose();
      navigate(`/agent/${id}`);
    } catch (e: any) {
      console.error('Failed to launch agent:', e);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-200 font-mono">Attach AI Agent</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleLaunchNew}
          disabled={launching}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 text-blue-400 font-mono text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 mb-4"
        >
          {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Launch New Agent
        </button>

        {freeAgents.length > 0 && (
          <>
            <p className="text-xs text-gray-600 font-mono uppercase tracking-widest mb-3">Attach Existing Agent</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {freeAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => handleAttachExisting(agent.id)}
                  disabled={attaching !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  {attaching === agent.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500 shrink-0" />
                    : <Cpu className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                  <span className="flex-1 text-xs text-gray-300 font-mono truncate">{agent.displayName}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {freeAgents.length === 0 && (
          <p className="text-xs text-gray-600 font-mono text-center py-2">No unattached agents available</p>
        )}
      </div>
    </div>
  );
}

// ─── TerminalView ─────────────────────────────────────────────────────────────

interface TerminalViewProps {
  terminal: TerminalSummary;
  onTerminate: () => void;
  onBack: () => void;
  onRefreshList: () => void;
}

function TerminalView({ terminal, onTerminate, onBack, onRefreshList }: TerminalViewProps) {
  const navigate = useNavigate();
  const [output, setOutput] = useState('');
  const [position, setPosition] = useState(0);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [connectedAgentIds, setConnectedAgentIds] = useState<string[]>(terminal.connectedAgentIds);
  const outputRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef(0);
  const mountedRef = useRef(true);

  // Load initial complete output
  useEffect(() => {
    mountedRef.current = true;
    terminalRPCClient.getCompleteOutput({ terminalName: terminal.name })
      .then(({ output: fullOutput }) => {
        if (!mountedRef.current) return;
        setOutput(fullOutput);
        setPosition(fullOutput.length);
        positionRef.current = fullOutput.length;
        // Scroll to bottom after load
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }, 0);
      })
      .catch(() => {});

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [terminal.name]);

  // Poll for new output
  useEffect(() => {
    if (!terminal.running) return;

    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const { output: newOutput, position: newPos } = await terminalRPCClient.retrieveOutput({
          terminalName: terminal.name,
          fromPosition: positionRef.current,
          minInterval: 0,
          settleInterval: 0,
          maxInterval: 0,
        });
        if (!mountedRef.current) return;
        if (newOutput) {
          setOutput(prev => prev + newOutput);
          setPosition(newPos);
          positionRef.current = newPos;
          setTimeout(() => {
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          }, 0);
        }
      } catch { /* terminal may have ended */ }
      if (mountedRef.current) {
        pollingRef.current = setTimeout(poll, 800);
      }
    };

    pollingRef.current = setTimeout(poll, 800);
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [terminal.name, terminal.running]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);
    try {
      await terminalRPCClient.sendInput({ terminalName: terminal.name, input: trimmed + '\n' });
    } catch (e: any) {
      console.error('Failed to send input:', e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, terminal.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      <div className="h-full flex flex-col bg-[#0d1117] overflow-hidden">
        {/* Title bar */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
          {/* macOS-style dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onBack}
              className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff7369] transition-colors cursor-pointer"
              title="Back"
            />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>

          <div className="flex-1 text-center text-xs text-gray-500 font-mono truncate px-2">
            {terminal.name} — {terminal.command}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              terminal.running ? 'bg-green-500 animate-pulse' : 'bg-gray-600',
            )} />
            <span className="text-xs text-gray-600 font-mono">
              {terminal.running ? 'running' : `exited (${terminal.exitCode ?? '?'})`}
            </span>
          </div>

          {/* Attach agent button */}
          <button
            onClick={() => setShowAttach(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-500 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors cursor-pointer font-mono"
            title="Attach AI agent"
          >
            <Bot className="w-3.5 h-3.5" />
            {connectedAgentIds.length > 0 && <span>{connectedAgentIds.length}</span>}
          </button>

          <button
            onClick={onTerminate}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors cursor-pointer rounded"
            title="Terminate terminal"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Connected agents row */}
        {connectedAgentIds.length > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border-b border-[#30363d] overflow-x-auto">
            <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest shrink-0 mr-1">agents:</span>
            {connectedAgentIds.map(id => (
              <button
                key={id}
                onClick={() => navigate(`/agent/${id}`)}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/20 border border-blue-800/40 text-blue-400 text-[10px] font-mono rounded cursor-pointer hover:bg-blue-900/40 transition-colors shrink-0"
              >
                <Cpu className="w-2.5 h-2.5" />
                {id.slice(0, 8)}…
              </button>
            ))}
          </div>
        )}

        {/* Output */}
        <pre
          ref={outputRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap break-words bg-[#0d1117]"
        >
          {output || <span className="text-gray-700">No output yet…</span>}
        </pre>

        {/* Input */}
        {terminal.running && (
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-[#0d1117] border-t border-[#30363d] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <span className="text-green-500 font-mono text-sm select-none shrink-0">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Send input to terminal…"
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-700 outline-none font-mono caret-green-400 disabled:cursor-not-allowed min-w-0"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600 shrink-0" />}
          </div>
        )}
      </div>

      {showAttach && (
        <AttachAgentDialog
          terminalName={terminal.name}
          connectedAgentIds={connectedAgentIds}
          onClose={() => setShowAttach(false)}
          onAttached={() => {
            setShowAttach(false);
            onRefreshList();
          }}
        />
      )}
    </>
  );
}

// ─── TerminalListItem ─────────────────────────────────────────────────────────

interface ListItemProps {
  terminal: TerminalSummary;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function TerminalListItem({ terminal, selected, onSelect, onDelete, deleting }: ListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        selected
          ? 'bg-[#21262d] border border-[#388bfd]/30'
          : 'hover:bg-[#161b22] border border-transparent',
      )}
    >
      <div className={cn(
        'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
        terminal.running ? 'bg-green-500' : 'bg-gray-600',
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 font-mono truncate">{terminal.name}</p>
        <p className="text-[10px] text-gray-600 font-mono truncate mt-0.5">{terminal.command}</p>
        {terminal.connectedAgentIds.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Bot className="w-2.5 h-2.5 text-blue-600" />
            <span className="text-[10px] text-blue-600 font-mono">{terminal.connectedAgentIds.length} agent{terminal.connectedAgentIds.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        disabled={deleting}
        className="shrink-0 p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded disabled:opacity-50"
        title="Terminate"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── TerminalApp ──────────────────────────────────────────────────────────────

export default function TerminalApp() {
  const terminals = useTerminalList();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showSpawn, setShowSpawn] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const terminalList: TerminalSummary[] = terminals.data?.terminals ?? [];
  const selected = terminalList.find(t => t.name === selectedName) ?? null;

  // Auto-select first terminal if current selection disappears
  useEffect(() => {
    if (selectedName && !terminalList.find(t => t.name === selectedName)) {
      setSelectedName(terminalList[0]?.name ?? null);
    }
  }, [terminalList, selectedName]);

  const handleSpawn = useCallback(async (command: string, workingDirectory: string) => {
    setSpawning(true);
    try {
      const { terminalName } = await terminalRPCClient.spawnTerminal({
        command,
        workingDirectory: workingDirectory || undefined,
      });
      await terminals.mutate();
      setSelectedName(terminalName);
      setShowSpawn(false);
    } catch (e: any) {
      console.error('Failed to spawn terminal:', e);
    } finally {
      setSpawning(false);
    }
  }, [terminals]);

  const handleTerminate = useCallback(async (name: string) => {
    setDeleting(name);
    try {
      await terminalRPCClient.terminateTerminal({ terminalName: name });
      await terminals.mutate();
      if (selectedName === name) setSelectedName(null);
    } catch (e: any) {
      console.error('Failed to terminate terminal:', e);
    } finally {
      setDeleting(null);
    }
  }, [selectedName, terminals]);

  return (
    <div className="h-full flex bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col border-r border-[#30363d] bg-[#0d1117]">
        {/* Sidebar header */}
        <div className="shrink-0 flex items-center justify-between px-3 py-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-gray-300 font-mono">Terminals</span>
          </div>
          <button
            onClick={() => setShowSpawn(true)}
            className="p-1 text-gray-600 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors cursor-pointer"
            title="New terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Terminal list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {terminals.isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            </div>
          )}
          {!terminals.isLoading && terminalList.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-700 font-mono">No terminals</p>
              <button
                onClick={() => setShowSpawn(true)}
                className="mt-3 text-xs text-green-600 hover:text-green-400 font-mono transition-colors cursor-pointer"
              >
                + New terminal
              </button>
            </div>
          )}
          {terminalList.map(terminal => (
            <TerminalListItem
              key={terminal.name}
              terminal={terminal}
              selected={terminal.name === selectedName}
              onSelect={() => setSelectedName(terminal.name)}
              onDelete={() => handleTerminate(terminal.name)}
              deleting={deleting === terminal.name}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selected ? (
          <TerminalView
            key={selected.name}
            terminal={selected}
            onTerminate={() => handleTerminate(selected.name)}
            onBack={() => setSelectedName(null)}
            onRefreshList={() => terminals.mutate()}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-600 to-slate-800 flex items-center justify-center mb-5 shadow-lg ring-1 ring-white/5">
              <Terminal className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-sm text-gray-500 font-mono mb-1">No terminal selected</p>
            <button
              onClick={() => setShowSpawn(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-800/60 text-green-400 font-mono text-sm rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Terminal
            </button>
          </div>
        )}
      </div>

      {showSpawn && (
        <SpawnDialog
          onSpawn={handleSpawn}
          onCancel={() => setShowSpawn(false)}
          spawning={spawning}
        />
      )}
    </div>
  );
}
