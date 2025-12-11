import { Plus, Moon, Sun, Settings, Trash2 } from 'lucide-react';
import {useNavigate} from "react-router-dom";
import { useTheme } from '../hooks/useTheme.ts';
import {agentRPCClient, useAgentList, useAgentTypes} from "../rpc.ts";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select.tsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu.tsx';

interface TopBarProps {
  agents: ReturnType<typeof useAgentList>;
  agentTypes: ReturnType<typeof useAgentTypes>;
  currentAgentId: string | null;
}

export default function TopBar({ agents, agentTypes, currentAgentId }: TopBarProps) {
  const navigate = useNavigate();

  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const selectAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const createAgent = async (type: string) => {
    const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
    await agents.mutate();
    navigate(`/agent/${id}`);
  };

  const deleteAgent = async (agentId: string) => {
    await agentRPCClient.deleteAgent({ agentId });
    await agents.mutate();
    navigate('/');
  };

  return (
    <div className="bg-secondary border-b border-default px-4 py-2 flex items-center gap-4 relative z-10">
      <h1 className="text-accent text-lg font-bold cursor-pointer" onClick={() => navigate("/")}>TokenRing Coder</h1>
      <Select value={currentAgentId || ''} onValueChange={selectAgent}>
        <SelectTrigger className="w-96">
          <SelectValue placeholder="Select Agent..." />
        </SelectTrigger>
        <SelectContent>
          {agents.data?.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name} ({a.id.slice(0, 8)})</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DropdownMenu>
        <DropdownMenuTrigger className="btn-primary border-none rounded-sm text-white cursor-pointer text-xs py-1.5 px-3 hover:btn-primary flex items-center gap-1">
          <Plus size={14} /> New Agent
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {agentTypes.data?.map(t => (
            <DropdownMenuItem key={t.type} onSelect={() => createAgent(t.type)}>
              {t.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto flex items-center gap-2">
        {currentAgentId && (
          <button
            onClick={() => deleteAgent(currentAgentId)}
            className="p-2 hover:bg-hover rounded cursor-pointer text-error"
            title="Delete current agent"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-hover rounded cursor-pointer text-primary"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="p-2 hover:bg-hover rounded cursor-pointer text-primary"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
