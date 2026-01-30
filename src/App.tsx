import { Routes, Route, useLocation, useParams } from 'react-router-dom';
import './index.css';
import { useAgentList, useAgentTypes, useWorkflows } from "./rpc.ts";
import AgentSelection from './pages/AgentSelection.tsx';
import ChatPage from './pages/ChatPage.tsx';
import Sidebar from './components/Sidebar.tsx';
import { SidebarProvider } from './components/SidebarContext.tsx';

export default function App() {
  const location = useLocation();

  const agents = useAgentList();
  const agentTypes = useAgentTypes();
  const workflows = useWorkflows();

  if (agents.isLoading || agentTypes.isLoading || workflows.isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh text-lg text-zinc-400 bg-[#050505]">
        Loading TokenRing...
      </div>
    );
  }

  const currentAgentId = location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null;

  return (
    <SidebarProvider>
      <div className="flex h-dvh bg-[#050505] text-zinc-300 antialiased font-sans selection:bg-indigo-500/30 overflow-hidden">
        <Sidebar
          currentAgentId={currentAgentId || ''}
          agents={agents}
          workflows={workflows}
          agentTypes={agentTypes}
        />
        <div className="flex-1 flex flex-col relative min-w-0">
          <main className="flex-1 min-h-0 relative">
            <Routes>
              <Route path="/agent/:agentId/*" element={<ChatPage key={currentAgentId} agentId={currentAgentId!} />} />
              <Route path="/" element={
                <AgentSelection
                  agents={agents}
                  agentTypes={agentTypes}
                  workflows={workflows}
                />
              } />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
