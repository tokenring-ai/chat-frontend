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

  const isMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        agents={agents}
        agentTypes={agentTypes}
        currentAgentId={location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/agent/:agentId/*" Component={() => <ChatPage agentId={useParams().agentId!} sidebarOpen={sidebarOpen} onSidebarChange={setSidebarOpen} />} />
          <Route path="/" element={
            <AgentSelection
              agents={agents}
              agentTypes={agentTypes}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}
