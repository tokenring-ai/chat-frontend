import React, { useState } from 'react';
import { Cpu, Check, Layers, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useAvailableTools, useEnabledTools} from '../rpc.ts';

interface ToolSelectorProps {
  agentId: string;
}

export default function ToolSelector({ agentId }: ToolSelectorProps) {
  const availableTools = useAvailableTools(agentId);
  const enabledTools = useEnabledTools(agentId);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleToggleTool = async (toolName: string) => {
    try {
      const isEnabled = enabledTools.data?.tools?.includes(toolName);
      if (isEnabled) {
        await chatRPCClient.disableTools({ agentId, tools: [toolName] });
      } else {
        await chatRPCClient.enableTools({ agentId, tools: [toolName] });
      }
      enabledTools.mutate();
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  const handleSetTools = async (tools: string[]) => {
    try {
      await chatRPCClient.setEnabledTools({ agentId, tools });
      enabledTools.mutate();
      setIsSelecting(false);
    } catch (error) {
      console.error('Failed to set tools:', error);
    }
  };

  // Group tools by package
  const toolsByPackage = React.useMemo(() => {
    const grouped: Record<string, string[]> = {};
    const packages = new Set<string>();

    availableTools.data?.tools?.forEach(tool => {
      const match = tool.match(/^(.*)\//);
      if (match) {
        const pkg = match[1];
        if (!grouped[pkg]) {
          grouped[pkg] = [];
        }
        grouped[pkg].push(tool);
        packages.add(pkg);
      } else {
        // Tools without package prefix (if any)
        const defaultPkg = 'core';
        if (!grouped[defaultPkg]) {
          grouped[defaultPkg] = [];
        }
        grouped[defaultPkg].push(tool);
        packages.add(defaultPkg);
      }
    });

    // Sort packages alphabetically
    Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    return { grouped, packages };
  }, [availableTools.data?.tools]);

  const enabledSet = new Set(enabledTools.data?.tools || []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900/50 transition-colors cursor-pointer group">
          <Layers className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
          <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 truncate max-w-48">
            {enabledTools.data?.tools?.length ?? 0} enabled
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-[600px] overflow-y-auto w-80">
        {/* Summary */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Available Tools</span>
            <span className="font-mono">{availableTools.data?.tools?.length ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
            <span>Enabled</span>
            <span className="font-mono">{enabledTools.data?.tools?.length ?? 0}</span>
          </div>
        </div>

        {/* Tools grouped by package */}
        {Array.from(toolsByPackage.packages).map((pkg) => (
          <div key={pkg}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/50">
              {pkg}
            </div>
            <div className="py-1">
              {toolsByPackage.grouped[pkg].map((toolName) => {
                const isEnabled = enabledSet.has(toolName);
                return (
                  <DropdownMenuItem
                    key={toolName}
                    onClick={() => handleToggleTool(toolName)}
                    className="flex items-center justify-between py-1.5 px-3 cursor-pointer hover:bg-zinc-800/50"
                  >
                    <span className="text-xs flex-1 truncate text-zinc-300">
                      {toolName.split('/').pop()}
                    </span>
                    {isEnabled ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </div>
        ))}

        {toolsByPackage.packages.size === 0 && (
          <div className="px-3 py-4 text-center text-xs text-zinc-500">
            No tools available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
