import React, { useState } from 'react';
import { Cpu, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';
import {chatRPCClient, useChatModelsByProvider, useModel} from '../rpc.ts';
import { toastManager } from './ui/Toast.tsx';

interface ModelSelectorProps {
  agentId: string;
}

export default function ModelSelector({ agentId }: ModelSelectorProps) {
  const currentModel = useModel(agentId);
  const modelsData = useChatModelsByProvider();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectModel = async (modelId: string) => {
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
  };

  const modelsByProvider = modelsData.data?.modelsByProvider || {};
  const hasModels = Object.keys(modelsByProvider).length > 0;

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
        <DropdownMenuContent className="max-h-96 overflow-y-auto w-80 bg-primary border-primary" aria-label="Select AI model">
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider bg-secondary/20">
                {provider}
              </div>
              {Object.entries(models).map(([modelId, modelInfo]) => (
                <DropdownMenuItem
                  key={modelId}
                  onClick={() => handleSelectModel(modelId)}
                  disabled={isSelecting}
                  className="flex items-center justify-between py-1.5 px-3 hover:bg-secondary/10 focus:bg-secondary/10"
                  aria-selected={currentModel.data?.model === modelId}
                  role="option"
                >
                  {
                    currentModel.data?.model === modelId
                      ? <Check className="w-3.5 h-3.5 text-indigo-500" aria-label="Currently selected" />
                      : modelInfo.available
                        ? <span className="text-emerald-500/70 mr-2" aria-label="Available">●</span>
                        : <span className="text-dim mr-2" aria-label="Unavailable">○</span>
                  }
                  <span className="flex-1 text-xs text-secondary">
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
