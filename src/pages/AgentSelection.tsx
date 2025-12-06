import { Trash2 } from 'lucide-react';
import {useNavigate} from "react-router-dom";
import {agentRPCClient, useAgentList, useAgentTypes} from "../rpc.ts";

interface AgentSelectionProps {
  agents: ReturnType<typeof useAgentList>;
  agentTypes: ReturnType<typeof useAgentTypes>;
}

export default function AgentSelection({ agents, agentTypes }: AgentSelectionProps) {
  const navigate = useNavigate();

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
    <div className="max-w-[600px] mx-auto my-[50px] px-5">
      <h1 className="text-accent text-4xl font-bold mb-6">TokenRing Coder</h1>
      <h2 className="text-info text-xl font-bold mb-5">Select or Create Agent</h2>
      {agents.data && (
        <div className="mb-8 flex flex-col gap-2">
          <h3 className="text-warning text-sm font-bold p-2.5">Running Agents</h3>
          {agents.data.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <button onClick={() => selectAgent(a.id)} className="flex-1 bg-tertiary border border-default text-primary cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-hover">
                {a.name} ({a.id.slice(0, 8)})
              </button>
              <button onClick={() => deleteAgent(a.id)} className="p-2.5 bg-tertiary border border-default text-error cursor-pointer transition-colors hover:bg-hover" title="Delete agent">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-8 flex flex-col gap-2">
        <h3 className="text-warning text-sm font-bold p-2.5">Create New Agent</h3>
        {agentTypes.data?.map(t => (
          <button key={t.type} onClick={() => createAgent(t.type)} className="w-full block bg-tertiary border border-default text-primary cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-hover">
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
