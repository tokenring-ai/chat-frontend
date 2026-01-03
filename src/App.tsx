import { Routes, Route, useLocation, useParams } from 'react-router-dom';
import './App.css';
import {useAgentList, useAgentTypes} from "./rpc.ts";
import AgentSelection from './pages/AgentSelection.tsx';
import ChatPage from './pages/ChatPage.tsx';
import TopBar from './components/TopBar.tsx';
import { useState } from 'react';

export default function App() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const agents = useAgentList();
  const agentTypes = useAgentTypes();

  if (agents.isLoading || agentTypes.isLoading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading agents...</div>;
  }

  const currentAgentId = location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-primary">
      <TopBar
        agents={agents}
        currentAgentId={currentAgentId}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <Routes>
          <Route path="/agent/:agentId/*" Component={() => <ChatPage agentId={useParams().agentId!} sidebarOpen={sidebarOpen} onSidebarChange={setSidebarOpen} />} />
          <Route path="/" element={
            <AgentSelection
              agents={agents}
              agentTypes={agentTypes}
            />
          } />
        </Routes>
      </main>
    </div>
  );
}
