import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import AgentRpcSchema from "@tokenring-ai/agent/rpc/schema";
import { Trash2 } from 'lucide-react';

interface AgentSelectionProps {
  agents: ResultOfRPCCall<typeof AgentRpcSchema, "listAgents">;
  agentTypes: ResultOfRPCCall<typeof AgentRpcSchema, "getAgentTypes">;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: (type: string) => void;
  onDeleteAgent: (agentId: string) => void;
}

export default function AgentSelection({ agents, agentTypes, onSelectAgent, onCreateAgent, onDeleteAgent }: AgentSelectionProps) {
  return (
    <div className="max-w-[600px] mx-auto my-[50px] px-5">
      <h1 className="text-accent text-4xl font-bold mb-6">TokenRing Coder</h1>
      <h2 className="text-info text-xl font-bold mb-5">Select or Create Agent</h2>
      {agents.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          <h3 className="text-warning text-sm font-bold p-2.5">Running Agents</h3>
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <button onClick={() => onSelectAgent(a.id)} className="flex-1 bg-tertiary border border-default text-primary cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-hover">
                {a.name} ({a.id.slice(0, 8)})
              </button>
              <button onClick={() => onDeleteAgent(a.id)} className="p-2.5 bg-tertiary border border-default text-error cursor-pointer transition-colors hover:bg-hover" title="Delete agent">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-8 flex flex-col gap-2">
        <h3 className="text-warning text-sm font-bold p-2.5">Create New Agent</h3>
        {agentTypes.map(t => (
          <button key={t.type} onClick={() => onCreateAgent(t.type)} className="w-full block bg-tertiary border border-default text-primary cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-hover">
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
