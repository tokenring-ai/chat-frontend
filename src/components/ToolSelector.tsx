import React, { useState, useMemo, useCallback } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useAvailableTools, useEnabledTools} from '../rpc.ts';
import {
  RiDatabaseFill,
  RiFlashlightFill,
  RiCloudFill,
  RiCodeBoxFill,
  RiGlobeFill,
  RiCodeLine,
  RiRobotFill,
  RiSlackFill,
  RiTelegramFill,
  RiNewsFill,
  RiWordpressFill,
  RiRedditFill,
  RiStackFill,
  RiCheckLine,
  RiCloseLine,
  RiSparklingFill,
  RiTerminalBoxFill,
  RiGitBranchFill,
  RiBugFill,
  RiFileCodeFill,
  RiEyeFill,
  RiFileSearchFill,
  RiRepeatFill,
  RiCodeSSlashFill,
  RiTaskFill,
  RiMicFill,
  RiAmazonFill,
  RiArticleFill,
  RiServerFill, 
  RiQuestionAnswerFill,
  RiCheckboxCircleFill,
  RiCheckboxBlankCircleLine
} from "react-icons/ri";

interface ToolSelectorProps {
  agentId: string;
}

// Package icon mapping
const packageIcons: Record<string, React.ReactNode> = {
  '@tokenring-ai/agent': <RiRobotFill />,
  '@tokenring-ai/ai-client': <RiDatabaseFill />,
  '@tokenring-ai/websearch': <RiGlobeFill />,
  '@tokenring-ai/filesystem': <RiCodeBoxFill />,
  '@tokenring-ai/memory': <RiCloudFill />,
  '@tokenring-ai/git': <RiGitBranchFill />,
  '@tokenring-ai/testing': <RiBugFill />,
  '@tokenring-ai/codebase': <RiFileCodeFill />,
  '@tokenring-ai/code-watch': <RiEyeFill />,
  '@tokenring-ai/file-index': <RiFileSearchFill />,
  '@tokenring-ai/iterables': <RiRepeatFill />,
  '@tokenring-ai/scripting': <RiCodeSSlashFill />,
  '@tokenring-ai/tasks': <RiTaskFill />,
  '@tokenring-ai/slack': <RiSlackFill />,
  '@tokenring-ai/telegram': <RiTelegramFill />,
  '@tokenring-ai/feedback': <RiQuestionAnswerFill />,
  '@tokenring-ai/blog': <RiArticleFill />,
  '@tokenring-ai/ghost-io': <RiArticleFill />,
  '@tokenring-ai/wordpress': <RiWordpressFill />,
  '@tokenring-ai/newsrpm': <RiNewsFill />,
  '@tokenring-ai/reddit': <RiRedditFill />,
  '@tokenring-ai/audio': <RiMicFill />,
  '@tokenring-ai/linux-audio': <RiMicFill />,
  '@tokenring-ai/sandbox': <RiCodeBoxFill />,
  '@tokenring-ai/docker': <RiServerFill />,
  '@tokenring-ai/kubernetes': <RiServerFill />,
  '@tokenring-ai/aws': <RiAmazonFill />,
  '@tokenring-ai/mcp': <RiDatabaseFill />,
  '@tokenring-ai/research': <RiSparklingFill />,
  '@tokenring-ai/cli': <RiTerminalBoxFill />,
  '@tokenring-ai/cli-ink': <RiTerminalBoxFill />,
  '@tokenring-ai/web-host': <RiServerFill />,
};

// Package color mapping
const packageColors: Record<string, string> = {
  '@tokenring-ai/agent': 'text-indigo-500',
  '@tokenring-ai/ai-client': 'text-blue-500',
  '@tokenring-ai/websearch': 'text-cyan-500',
  '@tokenring-ai/filesystem': 'text-emerald-500',
  '@tokenring-ai/memory': 'text-purple-500',
  '@tokenring-ai/git': 'text-orange-500',
  '@tokenring-ai/testing': 'text-pink-500',
  '@tokenring-ai/codebase': 'text-amber-500',
  '@tokenring-ai/code-watch': 'text-yellow-500',
  '@tokenring-ai/file-index': 'text-red-500',
  '@tokenring-ai/iterables': 'text-teal-500',
  '@tokenring-ai/scripting': 'text-lime-500',
  '@tokenring-ai/tasks': 'text-green-500',
  '@tokenring-ai/slack': 'text-indigo-500',
  '@tokenring-ai/telegram': 'text-blue-500',
  '@tokenring-ai/feedback': 'text-purple-500',
  '@tokenring-ai/blog': 'text-cyan-500',
  '@tokenring-ai/ghost-io': 'text-magenta-500',
  '@tokenring-ai/wordpress': 'text-blue-400',
  '@tokenring-ai/newsrpm': 'text-orange-500',
  '@tokenring-ai/reddit': 'text-red-500',
  '@tokenring-ai/audio': 'text-violet-500',
  '@tokenring-ai/linux-audio': 'text-violet-500',
  '@tokenring-ai/sandbox': 'text-blue-500',
  '@tokenring-ai/docker': 'text-blue-500',
  '@tokenring-ai/kubernetes': 'text-cyan-500',
  '@tokenring-ai/aws': 'text-orange-500',
  '@tokenring-ai/mcp': 'text-pink-500',
  '@tokenring-ai/research': 'text-purple-500',
  '@tokenring-ai/cli': 'text-emerald-500',
  '@tokenring-ai/cli-ink': 'text-emerald-500',
  '@tokenring-ai/web-host': 'text-orange-500',
};

export default function ToolSelector({ agentId }: ToolSelectorProps) {
  const availableTools = useAvailableTools(agentId);
  const enabledTools = useEnabledTools(agentId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const tools = availableTools.data?.tools;

  const handleToggleTool = useCallback(async (toolName: string) => {
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
  }, [agentId, enabledTools]);

  const handleToggleCategory = useCallback(async (category: string, categoryTools: Record<string, string>) => {
    try {
      const allToolNames = Object.values(categoryTools);
      const enabledSet = new Set(enabledTools.data?.tools || []);
      
      // Check if all tools are currently enabled
      const allEnabled = allToolNames.every(toolName => enabledSet.has(toolName));
      
      if (allEnabled) {
        // Disable all tools in category
        await chatRPCClient.disableTools({ agentId, tools: allToolNames });
      } else {
        // Enable all tools in category
        await chatRPCClient.enableTools({ agentId, tools: allToolNames });
      }
      enabledTools.mutate();
    } catch (error) {
      console.error('Failed to toggle category:', error);
    }
  }, [agentId, enabledTools]);

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const query = searchQuery.toLowerCase();
    return Object.fromEntries(Object.entries(tools ?? {}).filter(
      ([toolName, tool]) =>
        tool.displayName.toLowerCase().includes(query) ||
        toolName.toLowerCase().includes(query)
    ));
  }, [tools, searchQuery]);

  // Group tools by package
  const filteredToolsByCategory = useMemo(() => {
    const grouped: Record<string, Record<string,string>> = {};
    const categories = new Set<string>();

    for (const toolName in filteredTools ?? {}) {
      const tool = tools![toolName];
      const [, category = 'Unknown', displayName = tool.displayName] = tool.displayName.match(/^(.*)\/(.*)$/) ?? [];
      (grouped[category] ??= {})[displayName] = toolName;
      categories.add(category);
    }

    return { grouped, categories };
  }, [filteredTools, tools]);

  const enabledSet = new Set(enabledTools.data?.tools || []);

  // Auto-expand packages with enabled tools
  useMemo(() => {
    const categoriesWithEnabledTools = new Set<string>();
    enabledTools.data?.tools?.forEach(tool => {
      const match = tool.match(/^(.*)\//);
      if (match) {
        categoriesWithEnabledTools.add(match[1]);
      }
    });
    setExpandedCategories(categoriesWithEnabledTools);
  }, [enabledTools.data?.tools]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary/10 transition-colors cursor-pointer group">
          <RiStackFill className="w-3.5 h-3.5 text-dim group-hover:text-muted" />
          <span className="text-xs font-mono text-muted group-hover:text-secondary truncate max-w-48">
            {enabledTools.data?.tools?.length ?? 0} enabled
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-150 overflow-hidden flex flex-col bg-[#09090b] border-zinc-800" style={{ width: '560px' }} aria-label="Select AI tools">
        {/* Search Box */}
        <div className="relative group px-3 py-2 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Filter tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Tree List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-1 space-y-0.5">
          {Object.keys(filteredToolsByCategory.grouped).sort().map((category) => {
            const isPackageExpanded = expandedCategories.has(category);
            const packageIcon = packageIcons[category] || <RiDatabaseFill />;
            const packageColor = packageColors[category] || 'text-zinc-500';

            let categoryTools = filteredToolsByCategory.grouped[category];
            let toolCount = Object.keys(categoryTools).length;
            let enabledToolCount = 0;
            for (const [displayName, toolName] of Object.entries(categoryTools)) {
              if (enabledTools.data?.tools?.includes(toolName)) enabledToolCount++;
            }
            
            const allEnabled = enabledToolCount === toolCount;
            const allDisabled = enabledToolCount === 0;

            return (
              <div key={category} className="flex flex-col">
                {/* Package Header */}
                <div className="flex items-center cursor-pointer py-1.5 hover:bg-zinc-800/50 rounded-md px-2 transition-colors group select-none">
                  {/* Expand/Collapse Arrow */}
                  <div
                    className="w-5 flex items-center justify-center text-zinc-500 group-hover:text-zinc-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(category)) {
                          next.delete(category);
                        } else {
                          next.add(category);
                        }
                        return next;
                      });
                    }}
                  >
                    <svg className="w-3 h-3 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isPackageExpanded ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      )}
                    </svg>
                  </div>
                  
                  {/* Package Name */}
                  <div 
                    className="flex-1 flex items-center gap-2 text-zinc-300 text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(category)) {
                          next.delete(category);
                        } else {
                          next.add(category);
                        }
                        return next;
                      });
                    }}
                  >
                    <span className={packageColor}>{packageIcon}</span>
                    {category}
                  </div>
                  
                  {/* Bulk Enable/Disable Checkbox */}
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:bg-zinc-700/50 rounded px-1 py-0.5 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCategory(category, categoryTools);
                    }}
                    title={allEnabled ? "Disable all tools" : allDisabled ? "Enable all tools" : "Toggle all tools"}
                  >
                    <span className="text-[9px] font-mono text-zinc-600">
                      {enabledToolCount}/{toolCount}
                    </span>
                    {allEnabled ? (
                      <RiCheckboxCircleFill className="w-3.5 h-3.5 text-emerald-500" />
                    ) : allDisabled ? (
                      <RiCheckboxBlankCircleLine className="w-3.5 h-3.5 text-zinc-600 hover:text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded border-2 border-zinc-500 flex items-center justify-center">
                        <span className="text-[8px] text-zinc-400">{enabledToolCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tool List */}
                {isPackageExpanded && (
                <div className="flex flex-col pl-5 mt-0.5 space-y-0.5">
                  {Object.entries(categoryTools).map(([displayName, toolName]) => {
                    const isEnabled = enabledSet.has(toolName);
                    return (
                      <div
                        key={toolName}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTool(toolName);
                        }}
                        className="flex items-center cursor-pointer py-1.5 hover:bg-zinc-800/30 rounded-md px-3 transition-colors group"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.3)] ${
                            isEnabled
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                              : 'bg-zinc-600'
                          }`}
                        />
                        <span className="flex-1 text-xs font-mono text-zinc-300 group-hover:text-zinc-200 truncate">
                          {displayName}
                        </span>
                        {isEnabled ? (
                          <RiCheckLine className="w-3 h-3 text-emerald-500 ml-2 shrink-0" aria-label="Enabled" />
                        ) : (
                          <RiCloseLine className="w-3 h-3 text-zinc-600 ml-2 shrink-0" aria-label="Disabled" />
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}

          {filteredToolsByCategory.categories.size === 0 && (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">
              No tools found matching "{searchQuery}"
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
