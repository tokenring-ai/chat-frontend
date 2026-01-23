import React, { useState } from 'react';
import { Check, Layers, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useAvailableTools, useEnabledTools} from '../rpc.ts';

interface ToolSelectorProps {
  agentId: string;
}

export default function ToolSelector({ agentId }: ToolSelectorProps) {
  const availableTools = useAvailableTools(agentId);
  const enabledTools = useEnabledTools(agentId);

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
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary/10 transition-colors cursor-pointer group">
          <Layers className="w-3.5 h-3.5 text-dim group-hover:text-muted" />
          <span className="text-xs font-mono text-muted group-hover:text-secondary truncate max-w-48">
            {enabledTools.data?.tools?.length ?? 0} enabled
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-[600px] overflow-y-auto w-80 bg-primary border-primary">
        {/* Summary */}
        <div className="px-3 py-2 border-b border-primary">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Available Tools</span>
            <span className="font-mono">{availableTools.data?.tools?.length ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted mt-1">
            <span>Enabled</span>
            <span className="font-mono">{enabledTools.data?.tools?.length ?? 0}</span>
          </div>
        </div>

        {/* Tools grouped by package */}
        {Array.from(toolsByPackage.packages).map((pkg) => (
          <div key={pkg}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider bg-secondary/20">
              {pkg}
            </div>
            <div className="py-1">
              {toolsByPackage.grouped[pkg].map((toolName) => {
                const isEnabled = enabledSet.has(toolName);
                return (
                  <DropdownMenuItem
                    key={toolName}
                    onClick={() => handleToggleTool(toolName)}
                    className="flex items-center justify-between py-1.5 px-3 cursor-pointer hover:bg-secondary/10 focus:bg-secondary/10"
                  >
                    <span className="text-xs flex-1 truncate text-secondary">
                      {toolName.split('/').pop()}
                    </span>
                    {isEnabled ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-dim" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </div>
        ))}

        {toolsByPackage.packages.size === 0 && (
          <div className="px-3 py-4 text-center text-xs text-dim">
            No tools available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
