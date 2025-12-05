import AgentRpcSchema from "@tokenring-ai/agent/rpc/schema";
import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import './App.css';
import { agentRPCClient } from "./rpc.ts";
import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import AgentSelection from './pages/AgentSelection.tsx';
import ChatInterface from './pages/ChatInterface.tsx';
import TopBar from './components/TopBar.tsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agents, setAgents] = useState<ResultOfRPCCall<typeof AgentRpcSchema, "listAgents">>([]);
  const [agentTypes, setAgentTypes] = useState<ResultOfRPCCall<typeof AgentRpcSchema, "getAgentTypes">>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    loadAgents();
    loadAgentTypes();
  }, []);

  const loadAgents = async () => {
    try {
      const agents = await agentRPCClient.listAgents({});
      setAgents(agents);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentTypes = async () => {
    try {
      const agentTypes = await agentRPCClient.getAgentTypes({});
      setAgentTypes(agentTypes);
    } finally {}
  };

  const selectAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const createAgent = async (type: string) => {
    const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
    await loadAgents();
    navigate(`/agent/${id}`);
  };

  const deleteAgent = async (agentId: string) => {
    await agentRPCClient.deleteAgent({ agentId });
    await loadAgents();
    navigate('/');
  };



  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading agents...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        agents={agents}
        agentTypes={agentTypes}
        currentAgentId={location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null}
        onSelectAgent={selectAgent}
        onCreateAgent={createAgent}
        onDeleteAgent={deleteAgent}
      />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/agent/:agentId/*" element={<ChatPage agents={agents} />} />
          <Route path="/" element={
            <AgentSelection
              agents={agents}
              agentTypes={agentTypes}
              onSelectAgent={selectAgent}
              onCreateAgent={createAgent}
              onDeleteAgent={deleteAgent}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

function ChatPage({ agents }: { agents: ResultOfRPCCall<typeof AgentRpcSchema, "listAgents"> }) {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = agents.find(a => a.id === agentId);

  if (!agent) {
    return <div className="p-5 text-primary">Agent not found</div>;
  }

  return (
    <ChatInterface
      key={agent.id}
      agent={agent} 
      onSwitchAgent={() => navigate('/')} 
    />
  );
}
