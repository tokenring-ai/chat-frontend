import { Plus, Moon, Sun, Settings, Trash2, Menu, X } from 'lucide-react';
import {useNavigate} from "react-router-dom";
import { useTheme } from '../hooks/useTheme.ts';
import {agentRPCClient, useAgentList, useAgentTypes} from "../rpc.ts";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select.tsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';

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
    <div className="topbar-container bg-secondary border-b border-default px-2 py-2 flex items-center justify-between gap-1 sm:gap-4 relative z-10 h-14 sm:h-12">
      {/* Left section: Menu + Logo */}
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-hover rounded-md cursor-pointer text-primary flex items-center justify-center min-w-[40px] min-h-[40px]"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        
        <h1 
          className="text-accent text-sm sm:text-lg font-bold cursor-pointer flex-shrink-0 truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none" 
          onClick={() => navigate("/")}
        >
          TokenRing
        </h1>
      </div>
      
      {/* Middle section: Agent selector - Always visible, flexible width */}
      <div className="flex-1 flex justify-center min-w-0 px-1">
        <div className="w-full max-w-[180px] xs:max-w-[240px] sm:max-w-md">
          <Select value={currentAgentId || ''} onValueChange={selectAgent}>
            <SelectTrigger className="h-9 w-full bg-tertiary border-default">
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

      {/* Right section: Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
        {/* Action icons - Grouped or hidden on mobile if too many */}
        <div className="flex items-center">
          {currentAgentId && (
            <button
              onClick={() => deleteAgent(currentAgentId)}
              className="p-2 hover:bg-hover rounded-md cursor-pointer text-error flex items-center justify-center min-w-[36px]"
              title="Delete agent"
            >
              <Trash2 size={18} />
            </button>
          )}
          
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-hover rounded-md cursor-pointer text-primary flex items-center justify-center min-w-[36px]"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="hidden xs:flex p-2 hover:bg-hover rounded-md cursor-pointer text-primary items-center justify-center min-w-[36px]"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
