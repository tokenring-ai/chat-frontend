import React, { useState } from 'react';
import { Cpu, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useChatModelsByProvider, useModel} from '../rpc.ts';

interface ModelSelectorProps {
  agentId: string;
}

export default function ModelSelector({ agentId }: ModelSelectorProps) {
  const currentModel = useModel(agentId);
  const modelsData = useChatModelsByProvider();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectModel = async (modelId: string) => {
    try {
      await chatRPCClient.setModel({ agentId, model: modelId });
      currentModel.mutate({ model: modelId });
      setIsSelecting(false);
    } catch (error) {
      console.error('Failed to set model:', error);
    }
  };

  const modelsByProvider = modelsData.data?.modelsByProvider || {};
  const hasModels = Object.keys(modelsByProvider).length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900/50 transition-colors cursor-pointer group">
          <Cpu className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
          <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 truncate max-w-64">
            {currentModel.data?.model ?? 'Select model...'}
          </span>
        </div>
      </DropdownMenuTrigger>

      {hasModels && (
        <DropdownMenuContent className="max-h-96 overflow-y-auto w-80">
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/50">
                {provider}
              </div>
              {Object.entries(models).map(([modelId, modelInfo]) => (
                <DropdownMenuItem
                  key={modelId}
                  onClick={() => handleSelectModel(modelId)}
                  className="flex items-center justify-between py-1.5 px-3"
                >
                  {
                    currentModel.data?.model === modelId
                      ? <Check className="w-3.5 h-3.5 text-indigo-500" />
                      : modelInfo.available
                        ? <span className="text-emerald-500/70 mr-2">●</span>
                        : <span className="text-zinc-600 mr-2">○</span>
                  }
                  <span className="flex-1 text-xs">
                    {modelId.split('/').pop()}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
