import React, { useState, useMemo, useCallback } from 'react';
import { Cpu, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useChatModelsByProvider, useModel} from '../rpc.ts';
import { toastManager } from './ui/Toast.tsx';
import {
  RiAnthropicFill,
  RiCpuFill,
  RiCodeBoxFill,
  RiFlashlightFill,
  RiCloudFill,
  RiDatabaseFill,
  RiOpenaiFill,
  RiAlibabaCloudFill, RiGeminiFill, RiZhihuFill
} from "react-icons/ri";
import {TbArrowsSplit2, TbBrandAzure} from "react-icons/tb";

interface ModelSelectorProps {
  agentId: string;
}

// Provider icon mapping
const providerIcons: Record<string, React.ReactNode> = {
  anthropic: <RiAnthropicFill />,
  azure: <TbBrandAzure />,
  cerebras: <RiCpuFill />,
  deepseek: <RiCodeBoxFill />,
  google: <RiGeminiFill />,
  groq: <RiFlashlightFill />,
  openai: <RiOpenaiFill />,
  openrouter: <TbArrowsSplit2 />,
  qwen: <RiAlibabaCloudFill />,
  xai: <RiCloudFill />,
  zai: <RiZhihuFill />
};

// Provider color mapping
const providerColors: Record<string, string> = {
  anthropic: 'text-indigo-500',
  azure: 'text-blue-500',
  cerebras: 'text-amber-500',
  deepseek: 'text-cyan-500',
  google: 'text-blue-400',
  groq: 'text-orange-500',
  openai: 'text-white',
  openrouter: 'text-purple-500',
  qwen: 'text-pink-500',
  xai: 'text-zinc-100',
  zai: 'text-green-500',
};


export default function ModelSelector({ agentId }: ModelSelectorProps) {
  const currentModel = useModel(agentId);
  const modelsData = useChatModelsByProvider();
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  const handleSelectModel = useCallback(async (modelId: string) => {
    setIsSelecting(true);
    try {
      await chatRPCClient.setModel({ agentId, model: modelId });
      currentModel.mutate({ model: modelId });
      setIsSelecting(false);
      toastManager.success(`Model changed to ${modelId.split('/').pop()}`, { duration: 3000 });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to select model';
      console.error('Failed to set model:', error);
      toastManager.error(errorMessage, { duration: 5000 });
      setIsSelecting(false);
    }
  }, [agentId, currentModel]);

  const modelsByProvider = modelsData.data?.modelsByProvider || {};
  const hasModels = Object.keys(modelsByProvider).length > 0;

// Flatten models for search
  const allModels = useMemo(() => {
    return Object.entries(modelsByProvider).flatMap(([provider, models]) =>
      Object.entries(models)
        .map(([modelId, modelInfo]) => ({
          modelId,
          provider,
          modelName: modelId.split('/').pop() || modelId,
          available: modelInfo.available ?? true,
        }))
        .sort((a, b) => a.modelName.localeCompare(b.modelName))
    );
  }, [modelsByProvider]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return allModels;
    const query = searchQuery.toLowerCase();
    return allModels.filter(
      (model) =>
        model.modelName.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
    );
  }, [allModels, searchQuery]);

  // Group filtered models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, typeof allModels> = {};

    // Sort provider keys alphabetically
    const sortedProviders = Object.keys(modelsByProvider).sort();

    sortedProviders.forEach(provider => {
      const models = filteredModels.filter(m => m.provider === provider);
      if (models.length > 0) {
        groups[provider] = models;
      }
    });

    return groups;
  }, [filteredModels, modelsByProvider]);

  // Auto-expand provider with currently selected model
  useMemo(() => {
    if (currentModel.data?.model) {
      const provider = allModels.find(m => m.modelId === currentModel.data?.model)?.provider;
      if (provider) {
        setExpandedProviders(new Set([provider]));
      }
    }
  }, [currentModel.data?.model, allModels]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary/10 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary" role="button" aria-haspopup="true" aria-expanded="false">
          {isSelecting ? (
            <Cpu className="w-3.5 h-3.5 text-muted animate-spin" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-dim group-hover:text-muted" />
          )}
          <span className="text-xs font-mono text-muted group-hover:text-secondary truncate max-w-64">
            {isSelecting ? 'Loading...' : (currentModel.data?.model ?? 'Select model...')}
          </span>
        </div>
      </DropdownMenuTrigger>

      {hasModels && (
        <DropdownMenuContent className="max-h-150 overflow-hidden flex flex-col bg-[#09090b] border-zinc-800" style={{ width: '560px' }} aria-label="Select AI model">
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
                placeholder="Filter models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Tree List Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-1 space-y-0.5">
            {Object.entries(groupedModels).map(([provider, models]) => {
              const isProviderExpanded = expandedProviders.has(provider);
              const providerCode = models.length > 0 ? models[0]?.modelName.replace(/:.*/, '') : 'unknown';
              const providerIcon = providerIcons[providerCode] || <RiDatabaseFill />;
              const providerColor = providerColors[providerCode] || 'text-zinc-500';

              return (
                <div key={provider} className="flex flex-col">
                  {/* Provider Header */}
                  <div
                    className="flex items-center cursor-pointer py-1.5 hover:bg-zinc-800/50 rounded-md px-2 transition-colors group select-none"
                    onClick={() => {
                      setExpandedProviders(prev => {
                        const next = new Set(prev);
                        if (next.has(provider)) {
                          next.delete(provider);
                        } else {
                          next.add(provider);
                        }
                        return next;
                      });
                    }}
                  >
                    <span className="w-5 flex items-center justify-center text-zinc-500 group-hover:text-zinc-400">
                      <svg className="w-3 h-3 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isProviderExpanded ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        )}
                      </svg>
                    </span>
                    <div className="flex-1 flex items-center gap-2 text-zinc-300 text-xs font-medium">
                      <span className={providerColor}>{providerIcon}</span>
                      {provider}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-600 px-1.5">
                      {models.length}
                    </span>
                  </div>

                  {/* Model List */}
                  {isProviderExpanded && (
                  <div className="flex flex-col pl-5 mt-0.5 space-y-0.5">
                    {models.map((model) => (
                      <div
                        key={model.modelId}
                        onClick={() => handleSelectModel(model.modelId)}
                        className="flex items-center cursor-pointer py-1.5 hover:bg-zinc-800/30 rounded-md px-3 transition-colors group"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.3)] ${
                            currentModel.data?.model === model.modelId
                              ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                              : model.available
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                                : 'bg-zinc-600'
                          }`}
                        />
                        <span className="flex-1 text-xs font-mono text-zinc-300 group-hover:text-zinc-200 truncate">
                          {model.modelName}
                        </span>
                        {currentModel.data?.model === model.modelId && (
                          <Check className="w-3 h-3 text-indigo-400 ml-2 shrink-0" aria-label="Currently selected" />
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              );
            })}

            {filteredModels.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}