import { Trash2, Play, Cpu, User, Loader2, Pause } from 'lucide-react';
import { RiGithubFill, RiTwitterXFill } from 'react-icons/ri';
import { useNavigate } from "react-router-dom";
import { agentRPCClient, useAgentList, useAgentTypes, useWorkflows, workflowRPCClient } from "../rpc.ts";
import { toastManager } from "../components/ui/toast.tsx";
import ConfirmDialog from "../components/overlay/confirm-dialog.tsx";
import { useState } from "react";

interface AgentSelectionProps {
  agents: ReturnType<typeof useAgentList>;
  agentTypes: ReturnType<typeof useAgentTypes>;
  workflows: ReturnType<typeof useWorkflows>;
}

interface AgentItem {
  id: string;
  name: string;
  idle: boolean;
  statusMessage?: string;
}

export default function AgentSelection({ agents, agentTypes, workflows }: AgentSelectionProps) {
  const navigate = useNavigate();
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [creatingAgentType, setCreatingAgentType] = useState<string | null>(null);
  const [spawningWorkflow, setSpawningWorkflow] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const createAgent = async (type: string) => {
    setCreatingAgentType(type);
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
      await agents.mutate();
      navigate(`/agent/${id}`);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to create agent', { duration: 5000 });
    } finally {
      setCreatingAgentType(null);
    }
  };

  const spawnWorkflow = async (workflowName: string) => {
    setSpawningWorkflow(workflowName);
    try {
      const { id } = await workflowRPCClient.spawnWorkflow({ workflowName, headless: false });
      await agents.mutate();
      navigate(`/agent/${id}`);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to spawn workflow', { duration: 5000 });
    } finally {
      setSpawningWorkflow(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const agentId = confirmDelete;
    setConfirmDelete(null);
    setDeletingAgentId(agentId);
    try {
      await agentRPCClient.deleteAgent({ agentId });
      await agents.mutate();
    } finally {
      setDeletingAgentId(null);
    }
  };

  const groupedAgentTypes = (agentTypes.data || []).reduce((acc, t) => {
    const cat = t.category || 'Uncategorized';
    (acc[cat] ??= []).push(t);
    return acc;
  }, {} as Record<string, typeof agentTypes.data & {}>);

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-primary text-2xl font-bold tracking-tight mb-1">Welcome to TokenRing</h1>
            <p className="text-xs text-muted">Multi-agent orchestration and development platform</p>
          </div>

          {/* Active Agents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-2xs font-bold text-amber-600 dark:text-amber-500/90 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Active Agents
              </span>
              <span className="text-2xs text-muted">{agents.data?.length ?? 0} running</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(agents.data?.length ?? 0) === 0 ? (
                <div className="col-span-full px-4 py-6 text-center border border-dashed border-primary rounded-lg text-xs text-muted italic">
                  No agents currently active
                </div>
              ) : agents.data!.map((a: AgentItem) => (
                <div key={a.id} className="group flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg hover:border-amber-500/40 hover:bg-hover transition-all">
                  <div className="shrink-0">
                    {a.idle ? <Pause className="w-3.5 h-3.5 text-muted" /> : <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
                  </div>
                  <button
                    onClick={() => navigate(`/agent/${a.id}`)}
                    className="flex-1 flex flex-col text-left cursor-pointer min-w-0"
                    aria-label={`Select agent ${a.name}`}
                  >
                    <span className="text-sm font-medium text-primary truncate">{a.name}</span>
                    <span className="text-2xs text-muted truncate mt-0.5">{a.statusMessage || (a.idle ? 'Idle' : 'Busy')}</span>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a.id)}
                    disabled={deletingAgentId === a.id}
                    className="p-1 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete agent ${a.name}`}
                  >
                    {deletingAgentId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Workflows */}
          <div className="space-y-2">
            <div className="px-1">
              <span className="text-2xs font-bold text-cyan-600 dark:text-cyan-500/90 uppercase tracking-widest flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" /> Workflows
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(workflows.data?.length ?? 0) === 0 ? (
                <div className="col-span-full px-4 py-6 text-center border border-dashed border-primary rounded-lg text-xs text-muted italic">
                  No workflows available
                </div>
              ) : workflows.data!.map(workflow => (
                <button
                  key={workflow.key}
                  onClick={() => spawnWorkflow(workflow.key)}
                  disabled={spawningWorkflow === workflow.key}
                  className="flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg text-left hover:bg-hover hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                  aria-label={`Spawn workflow: ${workflow.name}`}
                >
                  <div className="shrink-0 text-cyan-500">
                    {spawningWorkflow === workflow.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{workflow.name}</div>
                    <div className="text-2xs text-muted line-clamp-1 mt-0.5">{workflow.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Agent */}
          <div className="space-y-3">
            <div className="px-1">
              <span className="text-2xs font-bold text-indigo-500/90 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Launch Agent
              </span>
            </div>
            {Object.entries(groupedAgentTypes).map(([category, templates]) => (
              <div key={category} className="space-y-1">
                <h3 className="text-2xs font-semibold text-muted uppercase tracking-wider px-1">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.type}
                      onClick={() => createAgent(t.type)}
                      disabled={creatingAgentType === t.type}
                      className="flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg text-left hover:bg-hover hover:border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                      aria-label={`Create new agent: ${t.name}`}
                    >
                      <div className="shrink-0 text-indigo-500/70">
                        {creatingAgentType === t.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{t.name}</div>
                        {t.description && <div className="text-2xs text-muted line-clamp-1 mt-0.5">{t.description}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <footer className="shrink-0 border-t border-primary bg-secondary px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-2xs text-muted">© {new Date().getFullYear()} TokenRing AI</span>
          <div className="flex items-center gap-3">
            <a href="https://github.com/tokenring-ai" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors focus-ring cursor-pointer" aria-label="TokenRing AI on GitHub">
              <RiGithubFill className="w-4 h-4" />
            </a>
            <a href="https://x.com/TokenRingAI" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors focus-ring cursor-pointer" aria-label="TokenRing AI on X">
              <RiTwitterXFill className="w-4 h-4" />
            </a>
            <a href="https://tokenring.ai" target="_blank" rel="noopener noreferrer" className="text-2xs text-muted hover:text-primary transition-colors focus-ring cursor-pointer">
              tokenring.ai
            </a>
          </div>
        </div>
      </footer>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Agent"
          message="Are you sure you want to delete this agent? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
