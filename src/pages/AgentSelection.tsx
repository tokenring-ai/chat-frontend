import { Trash2, Play, Cpu, User, Loader2, Pause, Zap } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { agentRPCClient, useAgentList, useAgentTypes, useWorkflows, workflowRPCClient } from "../rpc.ts";
import { useSidebar } from "../components/SidebarContext.tsx";
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
  const { toggleMobileSidebar } = useSidebar();
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [creatingAgentType, setCreatingAgentType] = useState<string | null>(null);
  const [spawningWorkflow, setSpawningWorkflow] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selectAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const createAgent = async (type: string) => {
    setCreatingAgentType(type);
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
      await agents.mutate();
      navigate(`/agent/${id}`);
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toastManager.error(error.message || 'Failed to create agent', { duration: 5000 });
    } finally {
      setCreatingAgentType(null);
    }
  };

  const spawnWorkflow = async (workflowName: string) => {
    setSpawningWorkflow(workflowName);
    try {
      const { id } = await workflowRPCClient.spawnWorkflow({
        workflowName,
        headless: false
      });
      await agents.mutate();
      navigate(`/agent/${id}`);
    } catch (error: any) {
      console.error('Failed to spawn workflow:', error);
      toastManager.error(error.message || 'Failed to spawn workflow', { duration: 5000 });
    } finally {
      setSpawningWorkflow(null);
    }
  };

  const deleteAgent = async (agentId: string) => {
    setConfirmDelete(agentId);
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

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      <header className="h-14 border-b border-primary flex items-center px-6 bg-primary z-10 shrink-0 md:hidden">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          aria-label="Toggle sidebar menu"
        >
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-primary text-5xl font-extrabold mb-4 tracking-tight">Welcome to TokenRing</h1>
            <p className="text-muted text-lg mb-4">
              Multi-agent orchestration and development platform
            </p>
            <div className="text-muted text-sm space-y-2 max-w-2xl">
              <p>
                TokenRing is a platform for building, orchestrating, and managing multi-agent systems. Get started by selecting an existing agent from the list below, spawning a workflow, or creating a new agent from one of our templates.
              </p>
              <p>
                Each agent is isolated and can be monitored, controlled, and debugged in real-time through the chat interface.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {/* Active Agents */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-amber-600/90 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={18} /> Active Agents
                </h2>
                <span className="text-xs text-muted bg-tertiary px-3 py-1 rounded-full">{agents.data?.length || 0} running</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.data && agents.data.length > 0 ? (
                  agents.data.map((a: AgentItem) => (
                    <div key={a.id} className="group flex items-center gap-3 bg-tertiary border border-primary p-4 rounded-xl hover:border-amber-600/50 hover:bg-hover transition-all">
                      <div className={`${a.idle ? 'text-dim' : 'text-amber-500'}`}>
                        {a.idle ? <Pause size={20} /> : <Loader2 size={20} className="animate-spin" />}
                      </div>
                      <button
                        onClick={() => selectAgent(a.id)}
                        className="flex-1 flex flex-col text-left cursor-pointer min-w-0"
                        aria-label={`Select agent ${a.name}`}
                      >
                        <span className="text-primary font-bold truncate">{a.name}</span>
                        {a.statusMessage && (
                          <span className="text-xs text-muted line-clamp-1 mt-1">{a.statusMessage}</span>
                        )}
                        <span className="text-[10px] text-dim font-mono mt-1">{a.id}</span>
                      </button>
                      <button
                        onClick={() => deleteAgent(a.id)}
                        disabled={deletingAgentId === a.id}
                        className="p-2 text-dim hover:text-red-400 hover:bg-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                        aria-label={`Delete agent ${a.name}`}
                      >
                        {deletingAgentId === a.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-10 text-center border-2 border-dashed border-primary rounded-xl text-muted text-sm">
                    No agents currently active
                  </div>
                )}
              </div>
            </div>

            {/* Workflows */}
            <div className="flex flex-col gap-4">
              <div className="px-2">
                <h2 className="text-cyan-600/90 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Play size={18} /> Workflows
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.data && workflows.data.length > 0 ? (
                  workflows.data.map(workflow => (
                    <button
                      key={workflow.key}
                      onClick={() => spawnWorkflow(workflow.key)}
                      disabled={spawningWorkflow === workflow.key}
                      className="flex items-center gap-4 bg-tertiary border border-primary p-5 rounded-xl text-left hover:bg-hover hover:border-cyan-600/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                      aria-label={`Spawn workflow: ${workflow.name}`}
                    >
                      <div className="bg-cyan-500/10 p-3 rounded-lg text-cyan-500">
                        {spawningWorkflow === workflow.key ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} fill="currentColor" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-primary font-bold">{workflow.name}</div>
                        <div className="text-xs text-muted line-clamp-2 mt-1">{workflow.description}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full p-6 text-center border border-dashed border-primary rounded-xl text-muted text-sm">
                    No workflows available
                  </div>
                )}
              </div>
            </div>

            {/* New Agent Types */}
            <div className="flex flex-col gap-4">
              <div className="px-2">
                <h2 className="text-purple-400/90 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <User size={18} /> New Agent
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentTypes.data?.map(t => (
                  <button
                    key={t.type}
                    onClick={() => createAgent(t.type)}
                    disabled={creatingAgentType === t.type}
                    className="flex items-center gap-4 bg-tertiary border border-primary p-5 rounded-xl text-left hover:bg-hover hover:border-purple-400/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                    aria-label={`Create new agent of type: ${t.name}`}
                  >
                    <div className="bg-purple-400/10 p-3 rounded-lg text-purple-400">
                      {creatingAgentType === t.type ? <Loader2 size={22} className="animate-spin" /> : <User size={22} fill="currentColor" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-primary font-bold">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-muted line-clamp-2 mt-1">{t.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-primary bg-secondary py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted">
          <span>© {new Date().getFullYear()} TokenRing AI. All rights reserved.</span>
          <a href="https://tokenring.ai" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors focus-ring">
            tokenring.ai
          </a>
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
