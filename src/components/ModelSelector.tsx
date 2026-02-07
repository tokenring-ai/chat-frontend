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
  anthropic: 'text-indigo-600 dark:text-indigo-400',
  azure: 'text-blue-600 dark:text-blue-400',
  cerebras: 'text-amber-600 dark:text-amber-500',
  deepseek: 'text-cyan-600 dark:text-cyan-500',
  google: 'text-blue-500 dark:text-blue-400',
  groq: 'text-orange-600 dark:text-orange-500',
  openai: 'text-zinc-900 dark:text-white',
  openrouter: 'text-purple-600 dark:text-purple-400',
  qwen: 'text-pink-600 dark:text-pink-500',
  xai: 'text-zinc-800 dark:text-zinc-100',
  zai: 'text-green-600 dark:text-green-500',
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
        <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-hover transition-colors cursor-pointer group focus-ring" role="button" aria-haspopup="true" aria-expanded="false">
          {isSelecting || currentModel.isLoading ? (
            <>
              <Cpu className="w-3.5 h-3.5 text-muted animate-spin" />
              <span className="text-xs font-mono text-muted truncate max-w-64">Loading...</span>
            </>
          ) : (
            <>
              <Cpu className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
              <span className="text-xs font-mono text-muted group-hover:text-primary truncate max-w-64">
                {currentModel.data?.model ?? 'Select model...'}
              </span>
            </>
          )}
        </div>
      </DropdownMenuTrigger>

      {hasModels && (
        <DropdownMenuContent className="max-h-150 overflow-hidden flex flex-col bg-secondary border-primary shadow-xl" style={{ width: '560px' }} aria-label="Select AI model">
          {/* Search Box */}
          <div className="relative group px-3 py-2 shrink-0 border-b border-primary">
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Filter models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-input border border-primary rounded-lg py-1.5 pl-9 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
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
                    className="flex items-center cursor-pointer py-1.5 hover:bg-hover rounded-md px-2 transition-colors group select-none"
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
                    <span className="w-5 flex items-center justify-center text-muted group-hover:text-primary">
                      <svg className="w-3 h-3 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isProviderExpanded ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        )}
                      </svg>
                    </span>
                    <div className="flex-1 flex items-center gap-2 text-primary text-xs font-medium">
                      <span className={providerColor}>{providerIcon}</span>
                      {provider}
                    </div>
                    <span className="text-2xs font-mono text-muted px-1.5">
                      {models.length}
                    </span>
                  </div>

                  {/* Model List */}
                  {isProviderExpanded && (
                  <div className="flex flex-col pl-5 mt-0.5 space-y-0.5 border-l border-primary ml-2">
                    {models.map((model) => (
                      <div
                        key={model.modelId}
                        onClick={() => handleSelectModel(model.modelId)}
                        className="flex items-center cursor-pointer py-1.5 hover:bg-hover rounded-md px-3 transition-colors group"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_6px_rgba(0,0,0,0.3)] ${
                            currentModel.data?.model === model.modelId
                              ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                              : model.available
                                ? 'bg-emerald-500'
                                : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                        />
                        <span className={`flex-1 text-xs font-mono truncate ${
                          currentModel.data?.model === model.modelId 
                            ? 'text-indigo-600 dark:text-indigo-400 font-medium' 
                            : 'text-muted group-hover:text-primary'
                        }`}>
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
              <div className="px-3 py-4 text-center text-xs text-muted">
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}