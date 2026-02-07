import {Zap, WifiOff} from 'lucide-react';
import {useAgent} from '../../rpc.ts';
import ModelSelector from '../ModelSelector.tsx';
import {useSidebar} from '../SidebarContext.tsx';
import ToolSelector from '../ToolSelector.tsx';
import {LightDarkModeSelector} from "../ui/LightDarkModeSelector.tsx";
import NotificationPanel from '../ui/NotificationPanel.tsx';
import { useConnectionStatus } from '../../hooks/useConnectionStatus.ts';

export default function ChatHeader({ agentId, idle }: { agentId: string, idle: boolean }) {
  const { toggleMobileSidebar } = useSidebar();
  const agent = useAgent(agentId);
  const { isOnline } = useConnectionStatus();
  return (
    <header aria-label="Chat controls" className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950"
          aria-label="Toggle sidebar menu"
        >
          <Zap className="w-4 h-4 text-white" fill="currentColor"/>
        </button>
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${idle ? 'bg-indigo-500' : 'bg-amber-500'}  animate-pulse`}/>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {agent.data?.config.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <WifiOff size={14} />
            <span>Offline</span>
          </div>
        )}
        <ModelSelector agentId={agentId}/>
        <ToolSelector agentId={agentId}/>
        <LightDarkModeSelector/>
        <NotificationPanel/>
      </div>
    </header>
  );
}
