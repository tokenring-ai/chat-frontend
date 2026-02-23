import { useState, useRef, useEffect } from 'react';
import { Zap, ChevronDown, Pause, Settings, User, WifiOff, Menu } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentList } from '../rpc.ts';
import { LightDarkSelector } from './ui/light-dark-selector.tsx';
import NotificationMenu from './ui/notification-menu.tsx';
import { useConnectionStatus } from '../hooks/useConnectionStatus.ts';
import { useSidebar } from './SidebarContext.tsx';

interface TopBarProps {
  currentAgentId: string | null;
  agents: ReturnType<typeof useAgentList>;
  agentControls?: React.ReactNode;
}

function ComingSoonDropdown({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-hover transition-colors text-muted focus-ring cursor-pointer"
        aria-label={label}
        title={label}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-secondary border border-primary rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 text-center">
            <p className="text-xs font-medium text-primary">{label}</p>
            <p className="text-2xs text-muted mt-1">Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopBar({ currentAgentId, agents, agentControls }: TopBarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isOnline } = useConnectionStatus();
  const { toggleMobileSidebar } = useSidebar();

  const agentList = agents.data || [];
  const currentAgent = agentList.find(a => a.id === currentAgentId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-12 border-b border-primary bg-secondary flex items-center px-4 gap-3 shrink-0 z-50">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 focus-ring rounded-lg shrink-0 cursor-pointer"
        aria-label="TokenRing Home"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        <span className="text-primary font-bold tracking-tight text-sm hidden sm:block">TokenRing</span>
      </button>

      {/* Mobile Menu Button - Hidden on desktop */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden p-2 rounded-lg hover:bg-hover transition-colors text-muted focus-ring cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="w-px h-5 bg-primary shrink-0" />

      {/* Agent Dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-hover transition-colors focus-ring text-sm cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {currentAgent ? (
            <>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentAgent.idle ? 'bg-indigo-500' : 'bg-amber-500'}`} />
              <span className="text-primary font-medium max-w-48 truncate">{currentAgent.name}</span>
            </>
          ) : (
            <span className="text-muted">Select agent</span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
        </button>

        {open && (
          <div
            className="absolute top-full left-0 mt-1 w-64 bg-secondary border border-primary rounded-lg shadow-xl z-50 overflow-hidden"
            role="listbox"
          >
            {agents.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-muted animate-spin" />
              </div>
            ) : agentList.length === 0 ? (
              <div className="px-4 py-4 text-xs text-muted text-center">No active agents</div>
            ) : (
              agentList.map(agent => (
                <button
                  key={agent.id}
                  role="option"
                  aria-selected={agent.id === currentAgentId}
                  onClick={() => { navigate(`/agent/${agent.id}`); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-hover transition-colors cursor-pointer ${agent.id === currentAgentId ? 'bg-active' : ''}`}
                >
                  <div className="shrink-0">
                    {agent.idle
                      ? <Pause className="w-3.5 h-3.5 text-muted" />
                      : <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{agent.name}</div>
                    <div className="text-2xs text-muted truncate">{agent.statusMessage || (agent.idle ? 'Idle' : 'Busy')}</div>
                  </div>
                </button>
              ))
            )}
            <div className="border-t border-primary">
              <button
                onClick={() => { navigate('/'); setOpen(false); }}
                className="w-full px-3 py-2 text-xs text-muted hover:text-primary hover:bg-hover transition-colors text-left cursor-pointer"
              >
                + New agent / workflows
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Agent-specific controls (model selector, tool selector) */}
      {agentControls && (
        <>
          <div className="w-px h-5 bg-primary shrink-0" />
          <div className="flex items-center gap-1">{agentControls}</div>
        </>
      )}

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1">
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs mr-2">
            <WifiOff size={14} />
            <span className="hidden sm:block">Offline</span>
          </div>
        )}
        <LightDarkSelector />
        <ComingSoonDropdown icon={<User className="w-4 h-4" />} label="Account" />
        <ComingSoonDropdown icon={<Settings className="w-4 h-4" />} label="Settings" />
        <NotificationMenu />
      </div>
    </header>
  );
}
