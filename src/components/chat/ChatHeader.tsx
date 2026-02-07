import {Zap, WifiOff} from 'lucide-react';
import {useAgent} from '../../rpc.ts';
import ModelSelector from '../ModelSelector.tsx';
import {useSidebar} from '../SidebarContext.tsx';
import ToolSelector from '../ToolSelector.tsx';
import {LightDarkSelector} from "../ui/light-dark-selector.tsx";
import NotificationMenu from '../ui/notification-menu.tsx';
import { useConnectionStatus } from '../../hooks/useConnectionStatus.ts';

export default function ChatHeader({ agentId, idle }: { agentId: string, idle: boolean }) {
  const { toggleMobileSidebar } = useSidebar();
  const agent = useAgent(agentId);
  const { isOnline } = useConnectionStatus();
  return (
    <header aria-label="Chat controls" className="h-14 border-b border-primary flex items-center justify-between px-6 bg-secondary z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform focus-ring"
          aria-label="Toggle sidebar menu"
        >
          <Zap className="w-4 h-4 text-white" fill="currentColor"/>
        </button>
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${idle ? 'bg-indigo-500' : 'bg-amber-500'} animate-pulse`} aria-label={idle ? 'Agent is idle' : 'Agent is busy'} role="status" />
          <span className="text-xs font-medium text-muted">
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
        <LightDarkSelector/>
        <NotificationMenu/>
      </div>
    </header>
  );
}
