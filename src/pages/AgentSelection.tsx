import type { ResultOfRPCCall } from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import { AgentRpcSchemas } from "@tokenring-ai/agent/rpc/types";

interface AgentSelectionProps {
  agents: ResultOfRPCCall<typeof AgentRpcSchemas, "listAgents">;
  agentTypes: ResultOfRPCCall<typeof AgentRpcSchemas, "getAgentTypes">;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: (type: string) => void;
}

export default function AgentSelection({ agents, agentTypes, onSelectAgent, onCreateAgent }: AgentSelectionProps) {
  return (
    <div className="max-w-[600px] mx-auto my-[50px] px-5">
      <h1 className="text-[#4ec9b0] text-4xl font-bold mb-6">TokenRing Coder</h1>
      <h2 className="text-[#9cdcfe] text-xl font-bold mb-5">Select or Create Agent</h2>
      {agents.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          <h3 className="text-[#dcdcaa] text-sm font-bold p-2.5">Running Agents</h3>
          {agents.map(a => (
            <button key={a.id} onClick={() => onSelectAgent(a.id)} className="w-full block bg-[#2d2d30] border border-[#3e3e42] text-[#d4d4d4] cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-[#3e3e42]">
              {a.name} ({a.id.slice(0, 8)})
            </button>
          ))}
        </div>
      )}
      <div className="mb-8 flex flex-col gap-2">
        <h3 className="text-[#dcdcaa] text-sm font-bold p-2.5">Create New Agent</h3>
        {agentTypes.map(t => (
          <button key={t.type} onClick={() => onCreateAgent(t.type)} className="w-full block bg-[#2d2d30] border border-[#3e3e42] text-[#d4d4d4] cursor-pointer text-sm p-2.5 text-left transition-colors hover:bg-[#3e3e42]">
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
