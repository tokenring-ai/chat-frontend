import { AgentRpcSchemas } from "@tokenring-ai/agent/rpc/types";
import { useEffect, useState } from 'react';
import './App.css';
import { agentRPCClient } from "./rpc.ts";
import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import AgentSelection from './pages/AgentSelection.tsx';
import ChatInterface from './pages/ChatInterface.tsx';

export default function App() {
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<ResultOfRPCCall<typeof AgentRpcSchemas, "listAgents">>([]);
  const [agentTypes, setAgentTypes] = useState<ResultOfRPCCall<typeof AgentRpcSchemas, "getAgentTypes">>([]);
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
    setCurrentAgentId(agentId);
  };

  const createAgent = async (type: string) => {
    await agentRPCClient.createAgent({ agentType: type, headless: false });
    await loadAgents();
  };

  const currentAgent = agents.find(a => a.id === currentAgentId);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading agents...</div>;
  }

  if (!currentAgent) {
    return (
      <AgentSelection
        agents={agents}
        agentTypes={agentTypes}
        onSelectAgent={selectAgent}
        onCreateAgent={createAgent}
      />
    );
  }

  return (
    <ChatInterface
      agent={currentAgent}
      onSwitchAgent={() => setCurrentAgentId(null)}
    />
  );
}
