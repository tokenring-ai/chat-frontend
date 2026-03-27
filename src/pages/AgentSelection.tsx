import {Cpu, Loader2, Pause, Play, Trash2, User} from 'lucide-react';
import {useState} from "react";
import {RiGithubFill, RiTwitterXFill} from 'react-icons/ri';
import {useNavigate} from "react-router-dom";
import CheckpointBrowser from "../components/CheckpointBrowser.tsx";
import ConfirmDialog from "../components/overlay/confirm-dialog.tsx";
import {toastManager} from "../components/ui/toast.tsx";
import {agentRPCClient, useAgentList, useAgentTypes, useWorkflows, workflowRPCClient} from "../rpc.ts";

interface AgentSelectionProps {
  agents: ReturnType<typeof useAgentList>;
  agentTypes: ReturnType<typeof useAgentTypes>;
  workflows: ReturnType<typeof useWorkflows>;
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
      await agentRPCClient.deleteAgent({ agentId, reason: "User initiated agent deletion from agent selection screen in Chat Web UI" });
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
                <div className="col-span-full px-4 py-6 text-center border border-dashed border-primary rounded-lg bg-secondary/30">
                  <Cpu className="w-8 h-8 text-muted mx-auto mb-3 opacity-50"/>
                  <p className="text-sm font-medium text-primary mb-2">No agents currently active</p>
                  <p className="text-2xs text-muted max-w-md mx-auto mb-4">
                    Create a new agent or spawn a workflow below to get started with TokenRing
                  </p>
                  <button
                    onClick={() => document.querySelector<HTMLButtonElement>('[data-launch-agent-btn]')?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors focus-ring shadow-lg shadow-indigo-600/20"
                    aria-label="Create a new agent to get started"
                  >
                    <User className="w-4 h-4"/>
                    Create Your First Agent
                  </button>
                </div>
              ) : agents.data!.map((a) => (
                <div key={a.id} className="group flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg hover:border-amber-500/50 hover:bg-hover transition-all shadow-sm">
                  <div className="shrink-0">
                    {a.idle ? <Pause className="w-3.5 h-3.5 text-muted" /> : <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
                  </div>
                  <button
                    onClick={() => navigate(`/agent/${a.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/agent/${a.id}`);
                      }
                    }}
                    className="flex-1 flex flex-col text-left cursor-pointer min-w-0"
                    aria-label={`Select agent ${a.displayName}`}
                    tabIndex={0}
                  >
                    <span className="text-sm font-medium text-primary truncate">{a.displayName}</span>
                    <span className="text-2xs text-muted truncate mt-0.5">{a.currentActivity}</span>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setConfirmDelete(a.id);
                      }
                    }}
                    disabled={deletingAgentId === a.id}
                    className="p-1.5 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                    aria-label={`Delete agent ${a.displayName}`}
                    tabIndex={0}
                  >
                    {deletingAgentId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Checkpoints */}
          <CheckpointBrowser agents={agents} />

          {/* Workflows */}
          <div className="space-y-2">
            <div className="px-1">
              <span className="text-2xs font-bold text-cyan-600 dark:text-cyan-500/90 uppercase tracking-widest flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" /> Workflows
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(workflows.data?.length ?? 0) === 0 ? (
                <div className="col-span-full px-4 py-6 text-center border border-dashed border-primary rounded-lg text-xs text-muted italic bg-secondary/30">
                  No workflows available
                </div>
              ) : workflows.data!.map(workflow => (
                <button
                  key={workflow.key}
                  onClick={() => spawnWorkflow(workflow.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      spawnWorkflow(workflow.key);
                    }
                  }}
                  disabled={spawningWorkflow === workflow.key}
                  className="flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg text-left hover:bg-hover hover:border-cyan-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring shadow-sm"
                  aria-label={`Spawn workflow: ${workflow.name}`}
                  tabIndex={0}
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
                  {templates.map((t, idx) => (
                    <button
                      key={t.type}
                      onClick={() => createAgent(t.type)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          createAgent(t.type);
                        }
                      }}
                      disabled={creatingAgentType === t.type}
                      className="flex items-center gap-3 bg-secondary border border-primary px-3 py-2.5 rounded-lg text-left hover:bg-hover hover:border-indigo-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring shadow-sm"
                      aria-label={`Create new agent: ${t.displayName}`}
                      tabIndex={0}
                      data-launch-agent-btn={idx === 0 ? "true" : undefined}
                    >
                      <div className="shrink-0 text-indigo-500/70">
                        {creatingAgentType === t.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{t.displayName}</div>
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
