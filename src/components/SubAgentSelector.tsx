import React, {useCallback, useMemo, useState} from 'react';
import {GiMegabot, GiRobotGrab} from "react-icons/gi";
import {RiCheckLine, RiCloseLine, RiRobotLine, RiSearchLine} from "react-icons/ri";
import {SiProbot} from "react-icons/si";
import {agentRPCClient, useAvailableSubAgents, useEnabledSubAgents} from '../rpc.ts';
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from './ui/dropdown-menu.tsx';

interface SubAgentSelectorProps {
  agentId: string;
  triggerVariant?: 'default' | 'icon';
}

export default function SubAgentSelector({agentId, triggerVariant = 'default'}: SubAgentSelectorProps) {
  const availableSubAgents = useAvailableSubAgents(agentId);
  const enabledSubAgents = useEnabledSubAgents(agentId);
  const [searchQuery, setSearchQuery] = useState('');
  const isIconTrigger = triggerVariant === 'icon';

  const agents = availableSubAgents.data?.agents;

  const handleToggleAgent = useCallback(async (agentType: string) => {
    try {
      const isEnabled = enabledSubAgents.data?.agents?.includes(agentType);
      if (isEnabled) {
        await agentRPCClient.disableSubAgents({agentId, agents: [agentType]});
      } else {
        await agentRPCClient.enableSubAgents({agentId, agents: [agentType]});
      }
      enabledSubAgents.mutate();
    } catch (error) {
      console.error('Failed to toggle sub-agent:', error);
    }
  }, [agentId, enabledSubAgents]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents ?? [];
    const query = searchQuery.toLowerCase();
    return (agents ?? []).filter(
      (agent) =>
        agent.displayName.toLowerCase().includes(query) ||
        agent.type.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);

  const enabledSet = useMemo(() => new Set(enabledSubAgents.data?.agents || []), [enabledSubAgents.data?.agents]);

  const agentCount = agents?.length ?? 0;
  const enabledCount = enabledSubAgents.data?.agents?.length ?? 0;
  const allEnabled = agentCount > 0 && enabledCount === agentCount;
  const allDisabled = enabledCount === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            isIconTrigger
              ? 'flex items-center justify-center p-1.5 rounded hover:bg-hover transition-colors cursor-pointer group focus-ring text-muted hover:text-primary'
              : 'hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-hover transition-colors cursor-pointer group focus-ring'
          }
          aria-label={`Select sub-agents. ${enabledCount} enabled`}
          title={`${enabledCount} sub-agents enabled`}
        >
          <GiMegabot className={isIconTrigger ? 'w-5 h-5' : 'w-3.5 h-3.5 text-muted group-hover:text-primary'}/>
          {!isIconTrigger && (
            <span className="text-xs font-mono text-muted group-hover:text-primary truncate max-w-48">
              {enabledCount} enabled
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-150 overflow-hidden flex flex-col bg-secondary border-primary shadow-xl" style={{width: '400px'}}
                           aria-label="Select sub-agents">
        <div className="flex items-center gap-2 px-3 pt-1 pb-2 shrink-0 border-b border-primary">
          <span className="text-sm flex-1 font-mono text-muted shrink-0">Sub-Agents</span>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              <RiSearchLine className="w-4 h-4 text-muted"/>
            </div>
            <input
              type="text"
              placeholder="Filter sub-agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-primary rounded-lg py-1.5 pl-9 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Toggle all agents button */}
        {agentCount > 1 && (
          <div className="border-b border-primary pl-4">
            <button
              onClick={() => {
                const allAgentTypes = (agents ?? []).map(a => a.type);
                if (allEnabled) {
                  agentRPCClient.disableSubAgents({agentId, agents: allAgentTypes});
                } else {
                  agentRPCClient.enableSubAgents({agentId, agents: allAgentTypes});
                }
                enabledSubAgents.mutate();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-hover transition-colors text-xs font-mono"
            >
              <span className="text-muted">
                {allEnabled ? 'Disable all sub-agents' : 'Enable all sub-agents'}
              </span>
              <span className="text-muted">
                {enabledCount}/{agentCount}
              </span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar py-1 space-y-0.5">
          {filteredAgents.map((agent) => {
            const isEnabled = enabledSet.has(agent.type);
            return (
              <div
                key={agent.type}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAgent(agent.type);
                }}
                className="flex items-center cursor-pointer py-2 hover:bg-hover rounded-md px-3 transition-colors group"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_6px_rgba(0,0,0,0.3)] ${
                    isEnabled
                      ? 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono truncate ${
                    isEnabled
                      ? 'text-purple-700 dark:text-purple-400 font-medium'
                      : 'text-muted group-hover:text-primary'
                  }`}>
                    {agent.displayName}
                  </div>
                  {agent.description && (
                    <div className="text-2xs text-dim font-mono truncate mt-0.5">
                      {agent.description}
                    </div>
                  )}
                </div>
                {isEnabled ? (
                  <RiCheckLine className="w-3.5 h-3.5 text-purple-600 dark:text-purple-500 ml-2 shrink-0" aria-label="Enabled"/>
                ) : (
                  <RiCloseLine className="w-3.5 h-3.5 text-muted ml-2 shrink-0" aria-label="Disabled"/>
                )}
              </div>
            );
          })}

          {filteredAgents.length === 0 && searchQuery && (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No sub-agents found matching "{searchQuery}"
            </div>
          )}

          {agentCount === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No sub-agents available
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
