import { Moon, Sun, Settings, Trash2, Menu, X } from 'lucide-react';
import {useNavigate} from "react-router-dom";
import { useTheme } from '../hooks/useTheme.ts';
import {agentRPCClient, useAgentList} from "../rpc.ts";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select.tsx';

interface TopBarProps {
  agents: ReturnType<typeof useAgentList>;
  currentAgentId: string | null;
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopBar({ agents, currentAgentId, onMenuClick, isSidebarOpen }: TopBarProps) {
  const navigate = useNavigate();

  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const selectAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const deleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    await agentRPCClient.deleteAgent({ agentId });
    await agents.mutate();
    navigate('/');
  };

  return (
    <div className="bg-secondary border-b border-primary px-4 py-3 relative z-[60] flex-shrink-0 w-full shadow-sm grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 md:flex-row">
      {/* Logo Section */}
      <div className="flex items-center gap-3 flex-shrink-0 col-start-1">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-hover rounded-lg cursor-pointer text-primary flex items-center justify-center transition-colors"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <h1
          className="text-accent text-xl font-bold cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          TokenRing
        </h1>
      </div>

      {/* Action Buttons - Placed after logo on mobile (row 1, col 3), but after selector on desktop */}
      <div className="flex items-center gap-2 flex-shrink-0 col-start-3 min-[500px]:order-3">
        {currentAgentId && (
          <button
            onClick={() => deleteAgent(currentAgentId)}
            className="p-2 hover:bg-hover rounded-lg cursor-pointer text-error flex items-center justify-center transition-colors"
            title="Delete agent"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-hover rounded-lg cursor-pointer text-primary flex items-center justify-center transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="sm:flex p-2 hover:bg-hover rounded-lg cursor-pointer text-primary items-center justify-center transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Agent selector - Full width on second row for mobile, middle column for desktop */}
      <div className="col-span-3 min-[500px]:col-span-1 min-[500px]:flex-1 flex justify-center min-w-0 min-[500px]:px-2 min-[500px]:order-2">
        <div className="w-full min-[500px]:max-w-xs">
          <Select value={currentAgentId || ''} onValueChange={selectAgent}>
            <SelectTrigger className="h-10 w-full bg-input border-primary shadow-sm hover:border-hover transition-colors">
              <SelectValue placeholder="Select Agent" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {agents.data?.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="truncate">{a.name}</span>
                </SelectItem>
              ))}
              {(!agents.data || agents.data.length === 0) && (
                <div className="p-2 text-xs text-muted text-center">No agents found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
