import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Settings,
  User,
  Trash2,
  Pause,
  Zap,
  Menu,
  X,
  PanelLeftClose
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentList, useAgentTypes, useWorkflows, agentRPCClient, workflowRPCClient } from '../rpc';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  currentAgentId: string;
  agents: ReturnType<typeof useAgentList>;
  workflows: ReturnType<typeof useWorkflows>;
  agentTypes: ReturnType<typeof useAgentTypes>;
}

export default function Sidebar({ currentAgentId, agents, workflows, agentTypes }: SidebarProps) {
  const navigate = useNavigate();
  const { isSidebarExpanded, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebar();

  const activeAgentsList = agents.data || [];
  const workflowsList = workflows.data || [];
  const templatesList = agentTypes.data || [];

  const navigateAndClose = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const createAgent = async (type: string) => {
    const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
    await agents.mutate();
    navigateAndClose(`/agent/${id}`);
  };

  const spawnWorkflow = async (workflowName: string) => {
    const { id } = await workflowRPCClient.spawnWorkflow({
      workflowName,
      headless: false
    });
    await agents.mutate();
    navigateAndClose(`/agent/${id}`);
  };

  const deleteAgent = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
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
        />
      )}

      <aside className={`fixed md:relative border-r border-zinc-900 bg-[#050505] flex flex-col shrink-0 overflow-hidden h-full z-40 transition-all duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarExpanded ? 'w-80' : 'w-16'} top-0 left-0 md:static`}>
        <div className={`p-4 flex items-center shrink-0 ${isSidebarExpanded ? 'justify-between' : 'justify-between md:justify-center'}`}>
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={isSidebarExpanded ? () => navigateAndClose('/') : toggleSidebar}
            title={!isSidebarExpanded ? "Expand sidebar" : "TokenRing Home"}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 transition-transform duration-200 ${!isSidebarExpanded ? 'group-hover:scale-110' : ''}`}>
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            {isSidebarExpanded && (
              <h1 className="text-white font-bold tracking-tight text-lg">TokenRing</h1>
            )}
          </div>

          {isSidebarExpanded && (
            <button
              onClick={toggleSidebar}
              className="hidden md:block text-zinc-400 hover:text-zinc-100 transition-colors p-1"
              title="Collapse"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isSidebarExpanded && (
          <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
            {/* Active Agents Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h2 className="text-[10px] font-bold text-amber-600/90 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Active Agents
                </h2>
                <span className="text-[9px] text-zinc-500">{activeAgentsList.length} running</span>
              </div>
              <div className="space-y-1">
                {activeAgentsList.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => navigateAndClose(`/agent/${agent.id}`)}
                    className={`group flex items-center gap-3 px-3 py-2 rounded transition-colors cursor-pointer ${currentAgentId === agent.id ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/30'
                      }`}
                  >
                    <div className="shrink-0">
                      {agent.idle ? (
                        <Pause className="w-3.5 h-3.5 text-zinc-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${currentAgentId === agent.id ? 'text-zinc-100' : 'text-zinc-300'}`}>{agent.name}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{agent.statusMessage || (agent.idle ? 'Agent is idle' : 'Agent is busy')}</div>
                    </div>
                    <button
                      onClick={(e) => deleteAgent(e, agent.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflows Section */}
            <div>
              <h2 className="text-[10px] font-bold text-cyan-600/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                <Play className="w-4 h-4" />
                Workflows
              </h2>
              <div className="space-y-1">
                {workflowsList.map((workflow) => (
                  <button
                    key={workflow.key}
                    onClick={() => spawnWorkflow(workflow.key)}
                    className="flex items-start gap-3 px-3 py-2 rounded hover:bg-zinc-900/30 transition-colors text-left group w-full"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5 fill-current" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-300 truncate">{workflow.name}</div>
                      <div className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{workflow.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Templates Section */}
            <div>
              <h2 className="text-[10px] font-bold text-purple-400/90 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Agent Templates
              </h2>
              <div className="space-y-3">
                {Object.entries(groupedTemplates).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="text-[9px] font-semibold text-purple-300/70 uppercase tracking-wider mb-2 px-3">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <button
                          key={template.type}
                          onClick={() => createAgent(template.type)}
                          className="flex items-start gap-3 px-3 py-2 rounded hover:bg-zinc-900/30 transition-colors text-left group w-full"
                        >
                          <User className="w-3.5 h-3.5 text-purple-300 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-300 truncate">{template.name}</div>
                            <div className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{template.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {isSidebarExpanded && (
          <div className="p-4 border-t border-zinc-900 shrink-0 hidden md:block">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-zinc-500 hover:text-zinc-300 transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Preferences</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}