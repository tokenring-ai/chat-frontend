import React, {useCallback, useMemo, useState} from 'react';
import {RiCheckLine, RiCloseCircleLine, RiCloseLine, RiFlashlightLine, RiSearchLine} from "react-icons/ri";
import {lifecycleRPCClient, useAvailableHooks, useEnabledHooks} from '../rpc.ts';
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from './ui/dropdown-menu.tsx';

interface HookSelectorProps {
  agentId: string;
  triggerVariant?: 'default' | 'icon';
}

export default function HookSelector({ agentId, triggerVariant = 'default' }: HookSelectorProps) {
  const availableHooks = useAvailableHooks();
  const enabledHooks = useEnabledHooks(agentId);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const isIconTrigger = triggerVariant === 'icon';

  const hooks = availableHooks.data?.hooks;

  const handleToggleHook = useCallback(async (hookName: string) => {
    try {
      const isEnabled = enabledHooks.data?.hooks?.includes(hookName);
      if (isEnabled) {
        await lifecycleRPCClient.disableHooks({ agentId, hooks: [hookName] });
      } else {
        await lifecycleRPCClient.enableHooks({ agentId, hooks: [hookName] });
      }
      enabledHooks.mutate();
    } catch (error) {
      console.error('Failed to toggle hook:', error);
    }
  }, [agentId, enabledHooks]);

  const filteredHooks = useMemo(() => {
    if (!searchQuery.trim()) return hooks;
    const query = searchQuery.toLowerCase();
    return Object.fromEntries(Object.entries(hooks ?? {}).filter(
      ([hookName, hook]) =>
        hook.displayName.toLowerCase().includes(query) ||
        hookName.toLowerCase().includes(query)
    ));
  }, [hooks, searchQuery]);

  const filteredHookNames = useMemo(() => Object.keys(filteredHooks ?? []), [filteredHooks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, hookName: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggleHook(hookName);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev + 1;
        return next < filteredHookNames.length ? next : 0;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : filteredHookNames.length - 1;
      });
    }
  }, [handleToggleHook, filteredHookNames.length]);

  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const enabledSet = useMemo(() => new Set(enabledHooks.data?.hooks || []), [enabledHooks.data?.hooks]);

  const hookCount = Object.keys(hooks ?? {}).length;
  const enabledCount = enabledHooks.data?.hooks?.length ?? 0;
  const allEnabled = hookCount > 0 && enabledCount === hookCount;


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
          aria-label={`Select hooks. ${enabledCount} of ${hookCount} enabled`}
          title={`${enabledCount} of ${hookCount} hooks enabled`}
        >
          <RiFlashlightLine className={isIconTrigger ? 'w-5 h-5' : 'w-3.5 h-3.5 text-muted group-hover:text-primary'} />
          {!isIconTrigger && (
            <span className="text-xs font-mono text-muted group-hover:text-primary truncate max-w-48">
              {enabledCount}/{hookCount} enabled
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-150 overflow-hidden flex flex-col bg-secondary border-primary shadow-xl" style={{ width: '400px' }} aria-label="Select lifecycle hooks">
        <div className="flex items-center gap-2 pl-4 pt-1 pb-2 shrink-0 border-b border-primary">
          <span className="text-sm flex-1 font-mono text-muted shrink-0">Hooks</span>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              <RiSearchLine className="w-4 h-4 text-muted" />
            </div>
            <input
              type="text"
              placeholder="Filter hooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  if (searchQuery) {
                    setSearchQuery('');
                  } else {
                    // Let the dropdown handle closing when search is empty
                  }
                }
              }}
              className="w-full bg-input border border-primary rounded-lg py-1.5 pl-9 pr-8 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="absolute inset-y-0 right-2 flex items-center text-muted hover:text-primary transition-colors"
                aria-label="Clear search"
              >
                <RiCloseCircleLine className="w-4 h-4"/>
              </button>
            )}
          </div>
        </div>

        {/* Toggle all hooks button */}
        {hookCount > 1 && (
          <div className="border-b border-primary pl-4">
            <button
              onClick={() => {
                const allHookNames = Object.keys(hooks ?? {});
                if (allEnabled) {
                  lifecycleRPCClient.disableHooks({ agentId, hooks: allHookNames });
                } else {
                  lifecycleRPCClient.enableHooks({ agentId, hooks: allHookNames });
                }
                enabledHooks.mutate();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-hover transition-colors text-xs font-mono"
            >
              <span className="text-muted">
                {allEnabled ? 'Disable all hooks' : 'Enable all hooks'}
              </span>
              <span className="text-muted">
                {enabledCount}/{hookCount}
              </span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar py-1 space-y-0.5" role="listbox" aria-label="Available hooks">
          {Object.entries(filteredHooks ?? {}).map(([hookName, hook], index) => {
            const isEnabled = enabledSet.has(hookName);
            const isFocused = focusedIndex === index;
            return (
              <div
                key={hookName}
                role="option"
                aria-selected={isEnabled}
                aria-focused={isFocused}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleHook(hookName);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleKeyDown(e, hookName);
                }}
                onFocus={() => handleItemFocus(index)}
                className={`flex items-center cursor-pointer py-2 rounded-md px-3 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isFocused ? 'bg-hover ring-2 ring-indigo-500/30' : 'hover:bg-hover'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.1)] dark:shadow-[0_0_6px_rgba(0,0,0,0.3)] ${
                    isEnabled
                      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono truncate ${
                    isEnabled
                      ? 'text-amber-700 dark:text-amber-400 font-medium'
                      : 'text-muted group-hover:text-primary'
                  }`}>
                    {hook.displayName}
                  </div>
                  {hook.description && (
                    <div className="text-2xs text-dim font-mono truncate mt-0.5">
                      {hook.description}
                    </div>
                  )}
                </div>
                {isEnabled ? (
                  <RiCheckLine className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 ml-2 shrink-0" aria-label="Enabled" />
                ) : (
                  <RiCloseLine className="w-3.5 h-3.5 text-muted ml-2 shrink-0" aria-label="Disabled" />
                )}
              </div>
            );
          })}

          {Object.keys(filteredHooks ?? {}).length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted" role="status">
              No hooks found matching "{searchQuery}"
            </div>
          )}

          {hookCount === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No hooks available
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
