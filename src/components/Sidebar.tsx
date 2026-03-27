import {Cpu, Loader2, PanelLeftClose, PanelLeftOpen, Pause, Play, Trash2, User, X} from 'lucide-react';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {agentRPCClient, useAgentList, useAgentTypes, useWorkflows, workflowRPCClient} from '../rpc';
import ConfirmDialog from './overlay/confirm-dialog.tsx';
import {useSidebar} from './SidebarContext';
import {toastManager} from './ui/toast';

interface SidebarProps {
  currentAgentId: string;
  agents: ReturnType<typeof useAgentList>;
  workflows: ReturnType<typeof useWorkflows>;
  agentTypes: ReturnType<typeof useAgentTypes>;
}

type Tab = 'agents' | 'workflows';

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'agents',    icon: <Cpu className="w-4 h-4" />,  label: 'Agents' },
  { id: 'workflows', icon: <Play className="w-4 h-4" />, label: 'Workflows' },
];

export default function Sidebar({ currentAgentId, agents, workflows, agentTypes }: SidebarProps) {
  const navigate = useNavigate();
  const {isSidebarExpanded, toggleSidebar, isMobileOpen, setMobileOpen, localStorageAvailable} = useSidebar();
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showStorageWarning, setShowStorageWarning] = useState(false);

  const navigateAndClose = (path: string) => { navigate(path); setMobileOpen(false); };

  // Show warning when localStorage becomes unavailable
  React.useEffect(() => {
    if (!localStorageAvailable && !showStorageWarning) {
      setShowStorageWarning(true);
      toastManager.warning(
        'Your sidebar preferences will not be saved. Browser storage is unavailable.',
        {duration: 8000}
      );
    }
  }, [localStorageAvailable, showStorageWarning]);

  const createAgent = async (type: string) => {
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
      await agents.mutate();
      navigateAndClose(`/agent/${id}`);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to create agent', { duration: 5000 });
    }
  };

  const spawnWorkflow = async (workflowName: string) => {
    try {
      const { id } = await workflowRPCClient.spawnWorkflow({ workflowName, headless: false });
      await agents.mutate();
      navigateAndClose(`/agent/${id}`);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to spawn workflow', { duration: 5000 });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const agentId = confirmDelete;
    setConfirmDelete(null);
    await agentRPCClient.deleteAgent({ agentId, reason: "User initiated agent deletion from sidebar in Chat Web UI" });
    await agents.mutate();
    if (currentAgentId === agentId) navigateAndClose('/');
  };

  const handleDeleteClick = async (agentId: string, isIdle: boolean) => {
    if (isIdle) {
      // Delete idle agents directly without confirmation
      await agentRPCClient.deleteAgent({ agentId, reason: "User initiated agent deletion from sidebar in Chat Web UI" });
      await agents.mutate();
      if (currentAgentId === agentId) navigateAndClose('/');
    } else {
      // Show confirmation for running agents
      setConfirmDelete(agentId);
    }
  };

  const groupedTemplates = (agentTypes.data || []).reduce((acc, t) => {
    const cat = t.category || 'Uncategorized';
    (acc[cat] ??= []).push(t);
    return acc;
  }, {} as Record<string, typeof agentTypes.data & {}>);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300" 
          onClick={() => setMobileOpen(false)} 
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navigation sidebar"
        className={`fixed md:relative border-r border-primary bg-sidebar flex flex-col shrink-0 overflow-hidden h-[calc(100vh-3rem)] md:h-full transition-all duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarExpanded ? 'w-72' : 'w-12'} top-12 left-0 md:top-auto md:left-auto z-40`}
      >
        {/* Tab bar / collapse toggle */}
        <div className={`flex shrink-0 border-b border-primary ${isSidebarExpanded ? 'items-center' : 'flex-col items-center py-2 gap-1'}`}>
          {isSidebarExpanded ? (
            <>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus-ring cursor-pointer rounded-md ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-primary'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                  aria-selected={activeTab === tab.id}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={toggleSidebar}
                className="p-1.5 mr-1 text-muted hover:text-primary transition-colors focus-ring hidden md:block cursor-pointer rounded-md active:scale-[0.98]"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setMobileOpen(false)} 
                className="p-1.5 mr-1 text-muted hover:text-primary md:hidden focus-ring cursor-pointer rounded-md active:scale-[0.98]" 
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); toggleSidebar(); }}
                  className={`p-1.5 rounded-md transition-colors focus-ring cursor-pointer active:scale-[0.98] ${activeTab === tab.id ? 'text-primary bg-active' : 'text-muted hover:text-primary hover:bg-hover'}`}
                  aria-label={tab.label}
                  title={tab.label}
                  tabIndex={0}
                >
                  {tab.icon}
                </button>
              ))}
              <div className="w-8 h-px bg-primary my-1" />
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-muted hover:text-primary transition-colors focus-ring cursor-pointer rounded-md active:scale-[0.98]"
                aria-label="Expand sidebar"
                tabIndex={0}
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Tab content */}
        {isSidebarExpanded && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 md:py-4">

            {activeTab === 'agents' && (
              <div className="space-y-4">
                {/* Active Agents */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-2xs font-bold text-amber-600 dark:text-amber-500/90 uppercase tracking-widest">Active Agents</span>
                    <span className="text-2xs text-muted" aria-live="polite">{agents.data?.length ?? 0} running</span>
                  </div>
                  {agents.isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted animate-spin" /></div>
                  ) : (agents.data?.length ?? 0) === 0 ? (
                    <div className="px-3 py-4 text-center text-muted text-2xs italic">No active agents</div>
                  ) : agents.data!.map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => navigateAndClose(`/agent/${agent.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateAndClose(`/agent/${agent.id}`); } }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-all cursor-pointer focus-ring ${currentAgentId === agent.id ? 'bg-active border border-primary' : 'hover:bg-hover border border-transparent'}`}
                      role="button" tabIndex={0}
                      aria-label={`Open agent ${agent.displayName}`}
                      aria-current={currentAgentId === agent.id ? 'page' : undefined}
                    >
                      <div className="shrink-0" aria-hidden="true">
                        {agent.idle ? <Pause className="w-3.5 h-3.5 text-muted" /> : <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${currentAgentId === agent.id ? 'text-primary' : 'text-secondary'}`}>{agent.displayName}</div>
                        <div className="text-2xs text-muted mt-0.5 truncate">{agent.currentActivity}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(agent.id, agent.idle); }}
                        className="p-1.5 text-muted hover:text-red-500 transition-colors opacity-40 hover:opacity-100 group-focus-within:opacity-100 focus-ring cursor-pointer rounded-md active:scale-[0.98]"
                        aria-label={`Delete agent ${agent.displayName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Launch Agent */}
                <div className="space-y-3">
                  <span className="text-2xs font-bold text-indigo-500/90 uppercase tracking-widest px-2 block">Launch Agent</span>
                  {agentTypes.isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-muted animate-spin" /></div>
                  ) : Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category}>
                      <h3 className="text-2xs font-semibold text-muted uppercase tracking-wider mb-1 px-2">{category}</h3>
                      <div className="space-y-1">
                        {templates.map(template => (
                          <button
                            key={template.type}
                            onClick={() => createAgent(template.type)}
                            className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-hover transition-all text-left group w-full focus-ring cursor-pointer active:scale-[0.98]"
                            aria-label={`Create new agent: ${template.displayName}`}
                          >
                            <User className="w-3.5 h-3.5 text-indigo-500/70 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-secondary group-hover:text-primary truncate">{template.displayName}</div>
                              <div className="text-2xs text-muted line-clamp-1 mt-0.5">{template.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'workflows' && (
              <div className="space-y-1">
                {workflows.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted animate-spin" /></div>
                ) : (workflows.data?.length ?? 0) === 0 ? (
                  <div className="px-3 py-4 text-center text-muted text-2xs italic">No workflows available</div>
                ) : workflows.data!.map(workflow => (
                  <button
                    key={workflow.key}
                    onClick={() => spawnWorkflow(workflow.key)}
                    className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-hover transition-all text-left group w-full focus-ring cursor-pointer active:scale-[0.98]"
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
        )}
      </aside>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Running Agent"
          message="This agent is currently running. Are you sure you want to delete it? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
        />
      )}
    </>
  );
}

