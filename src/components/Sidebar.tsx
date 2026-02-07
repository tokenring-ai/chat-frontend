import React from 'react';
import {
  Cpu,
  Play,
  Settings,
  User,
  Trash2,
  Pause,
  Zap,
  X,
  PanelLeftClose,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentList, useAgentTypes, useWorkflows, agentRPCClient, workflowRPCClient } from '../rpc';
import { useSidebar } from './SidebarContext';
import { toastManager } from './ui/toast';
import ConfirmDialog from './overlay/confirm-dialog.tsx';

interface SidebarProps {
  currentAgentId: string;
  agents: ReturnType<typeof useAgentList>;
  workflows: ReturnType<typeof useWorkflows>;
  agentTypes: ReturnType<typeof useAgentTypes>;
}

export default function Sidebar({ currentAgentId, agents, workflows, agentTypes }: SidebarProps) {
  const navigate = useNavigate();
  const { isSidebarExpanded, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebar();
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  const activeAgentsList = agents.data || [];
  const workflowsList = workflows.data || [];
  const templatesList = agentTypes.data || [];

  const navigateAndClose = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const createAgent = async (type: string) => {
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
      await agents.mutate();
      navigateAndClose(`/agent/${id}`);
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toastManager.error(error.message || 'Failed to create agent', { duration: 5000 });
    }
  };

  const spawnWorkflow = async (workflowName: string) => {
    try {
      const { id } = await workflowRPCClient.spawnWorkflow({
        workflowName,
        headless: false
      });
      await agents.mutate();
      navigateAndClose(`/agent/${id}`);
    } catch (error: any) {
      console.error('Failed to spawn workflow:', error);
      toastManager.error(error.message || 'Failed to spawn workflow', { duration: 5000 });
    }
  };

  const deleteAgent = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setConfirmDelete(agentId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const agentId = confirmDelete;
    setConfirmDelete(null);
    await agentRPCClient.deleteAgent({ agentId });
    await agents.mutate();
    if (currentAgentId === agentId) {
      navigateAndClose('/');
    }
  };

  const groupedTemplates = templatesList.reduce((acc, template) => {
    const category = template.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof templatesList>);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navigation sidebar"
        className={`fixed md:relative border-r border-primary bg-sidebar flex flex-col shrink-0 overflow-hidden h-full transition-all duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarExpanded ? 'w-80' : 'w-16'} top-0 left-0 md:static z-40`}
      >
        <div className={`p-4 flex items-center shrink-0 ${isSidebarExpanded ? 'justify-between' : 'justify-between md:justify-center'}`}>
          <button
            className="flex items-center gap-3 cursor-pointer group focus-ring rounded-lg"
            onClick={isSidebarExpanded ? () => navigateAndClose('/') : toggleSidebar}
            aria-label={!isSidebarExpanded ? "Expand sidebar" : "TokenRing Home"}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 transition-transform duration-200 ${!isSidebarExpanded ? 'group-hover:scale-110' : ''}`}>
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            {isSidebarExpanded && (
              <h1 className="text-primary font-bold tracking-tight text-lg">TokenRing</h1>
            )}
          </button>

          {isSidebarExpanded && (
            <button
              onClick={toggleSidebar}
              className="hidden md:block text-muted hover:text-primary transition-colors p-1 focus-ring"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted hover:text-primary transition-colors focus-visible:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isSidebarExpanded ? (
          <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Active Agents Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h2 className="text-2xs font-bold text-amber-600 dark:text-amber-500/90 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Active Agents
                </h2>
                <span className="text-2xs text-muted" aria-live="polite">{activeAgentsList.length} running</span>
              </div>
              {agents.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" />
                </div>
              ) : activeAgentsList.length === 0 ? (
                <div className="px-3 py-4 text-center text-muted text-xs italic">
                  No active agents
                </div>
              ) : (
                <div className="space-y-1">
                  {activeAgentsList.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => navigateAndClose(`/agent/${agent.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigateAndClose(`/agent/${agent.id}`);
                        }
                      }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        currentAgentId === agent.id
                          ? 'bg-active border border-primary'
                          : 'hover:bg-hover border border-transparent'
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open agent ${agent.name}`}
                      aria-current={currentAgentId === agent.id ? 'page' : undefined}
                    >
                      <div className="shrink-0" aria-hidden="true">
                        {agent.idle ? (
                          <Pause className="w-3.5 h-3.5 text-muted" />
                        ) : (
                          <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${currentAgentId === agent.id ? 'text-primary' : 'text-secondary'}`}>{agent.name}</div>
                        <div className="text-2xs text-muted mt-0.5 truncate">{agent.statusMessage || (agent.idle ? 'Agent is idle' : 'Agent is busy')}</div>
                      </div>
                      <button
                        onClick={(e) => deleteAgent(e, agent.id)}
                        className="p-1 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus-ring"
                        aria-label={`Delete agent ${agent.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workflows Section */}
            <div>
              <h2 className="text-2xs font-bold text-cyan-600 dark:text-cyan-500/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                <Play className="w-4 h-4" />
                Workflows
              </h2>
              {workflows.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" />
                </div>
              ) : workflowsList.length === 0 ? (
                <div className="px-3 py-4 text-center text-muted text-sm italic">
                  No workflows available
                </div>
              ) : (
                <div className="space-y-1">
                  {workflowsList.map((workflow) => (
                    <button
                      key={workflow.key}
                      onClick={() => spawnWorkflow(workflow.key)}
                      className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-hover transition-all text-left group w-full cursor-pointer focus-ring"
                      aria-label={`Spawn workflow: ${workflow.name}`}
                    >
                      <Play className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5 fill-current opacity-70 group-hover:opacity-100" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-secondary group-hover:text-primary truncate">{workflow.name}</div>
                        <div className="text-2xs text-muted line-clamp-1 mt-0.5">{workflow.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Templates Section */}
            <div>
              <h2 className="text-2xs font-bold text-indigo-600 dark:text-indigo-400/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Templates
              </h2>
              {agentTypes.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" />
                </div>
              ) : templatesList.length === 0 ? (
                <div className="px-3 py-4 text-center text-muted text-sm italic">
                  No templates available
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category}>
                      <h3 className="text-2xs font-semibold text-muted uppercase tracking-wider mb-2 px-3">
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {templates.map((template) => (
                          <button
                            key={template.type}
                            onClick={() => createAgent(template.type)}
                            className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-hover transition-all text-left group w-full cursor-pointer focus-ring"
                            aria-label={`Create new agent: ${template.name}`}
                          >
                            <User className="w-3.5 h-3.5 text-indigo-500/70 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-secondary group-hover:text-primary truncate">{template.name}</div>
                              <div className="text-2xs text-muted line-clamp-1 mt-0.5">{template.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 px-2 py-4 space-y-4 flex flex-col items-center">
            {/* Collapsed mode: Show icons only */}
            <button
              onClick={() => currentAgentId ? navigateAndClose(`/agent/${currentAgentId}`) : toggleSidebar()}
              className={`p-2 rounded-lg hover:bg-hover text-muted transition-colors cursor-pointer focus-ring ${currentAgentId ? 'bg-active' : ''}`}
              aria-label="Current agent"
            >
              <Cpu className="w-6 h-6 text-amber-500" />
            </button>
            <div className="w-8 h-[1px] bg-primary" />
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-hover text-muted transition-colors focus-ring"
            >
              <Play className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer */}
        {isSidebarExpanded && (
          <div className="p-4 border-t border-primary shrink-0">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-muted hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-hover focus-ring" aria-label="Open preferences">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Preferences</span>
            </button>
          </div>
        )}
      </aside>
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
    </>
  );
}