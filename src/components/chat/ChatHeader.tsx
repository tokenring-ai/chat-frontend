import { Moon, Sun, Zap } from 'lucide-react';
import ModelSelector from '../ModelSelector.tsx';
import ToolSelector from '../ToolSelector.tsx';
import { useSidebar } from '../SidebarContext.tsx';
import { useAgent } from '../../rpc.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export default function ChatHeader({ agentId }: { agentId: string }) {
  const { toggleMobileSidebar } = useSidebar();
  const agent = useAgent(agentId);
  const [theme, setTheme] = useTheme();

  return (
    <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-[#050505] z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          aria-label="Toggle sidebar menu"
        >
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
          <span className="text-xs font-medium text-zinc-400">
            {agent.data?.config.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-zinc-900/50 transition-colors text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <ModelSelector agentId={agentId} />
        <ToolSelector agentId={agentId} />
      </div>
    </header>
  );
}
