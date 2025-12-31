import { Trash2, Play, Plus, Cpu, Workflow } from 'lucide-react';
import {useNavigate} from "react-router-dom";
import {agentRPCClient, useAgentList, useAgentTypes, useWorkflows, workflowRPCClient} from "../rpc.ts";

interface AgentSelectionProps {
  agents: ReturnType<typeof useAgentList>;
  agentTypes: ReturnType<typeof useAgentTypes>;
}

export default function AgentSelection({ agents, agentTypes }: AgentSelectionProps) {
  const navigate = useNavigate();
  const workflows = useWorkflows();

  const selectAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const createAgent = async (type: string) => {
    const { id } = await agentRPCClient.createAgent({ agentType: type, headless: false });
    await agents.mutate();
    navigate(`/agent/${id}`);
  };

  const spawnWorkflow = async (workflowName: string) => {
    const { id } = await workflowRPCClient.spawnWorkflow({ 
      workflowName, 
      headless: false 
    });
    await agents.mutate();
    navigate(`/agent/${id}`);
  };

  const deleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    await agentRPCClient.deleteAgent({ agentId });
    await agents.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6 h-full overflow-y-auto">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-accent text-3xl sm:text-5xl font-extrabold mb-3 tracking-tight">TokenRing</h1>
        <p className="text-muted text-base sm:text-lg max-w-2xl">
          Multi-agent orchestration and development platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Active Agents */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-warning text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Cpu size={16} /> Active Agents
            </h2>
            <span className="text-xs text-muted">{agents.data?.length || 0} running</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {agents.data && agents.data.length > 0 ? (
              agents.data.map(a => (
                <div key={a.id} className="group flex items-center gap-2 bg-secondary border border-default p-1 rounded-lg hover:border-accent/50 transition-all">
                  <button 
                    onClick={() => selectAgent(a.id)} 
                    className="flex-1 flex flex-col p-3 text-left cursor-pointer min-w-0"
                  >
                    <span className="text-primary font-bold truncate">{a.name}</span>
                    <span className="text-[10px] text-muted font-mono">{a.id}</span>
                  </button>
                  <button 
                    onClick={() => deleteAgent(a.id)} 
                    className="p-3 text-muted hover:text-error transition-colors mr-1"
                    title="Delete agent"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-dashed border-default rounded-lg text-muted text-sm italic">
                No agents currently active.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workflows & Creation */}
        <div className="flex flex-col gap-8">
          {/* Workflows */}
          <div className="flex flex-col gap-4">
            <div className="px-2">
              <h2 className="text-info text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Workflow size={16} /> Workflows
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {workflows.data && workflows.data.length > 0 ? (
                workflows.data.map(workflow => (
                  <button 
                    key={workflow.key} 
                    onClick={() => spawnWorkflow(workflow.key)} 
                    className="flex items-start gap-3 bg-secondary border border-default p-4 rounded-lg text-left hover:bg-hover hover:border-info/50 transition-all cursor-pointer"
                  >
                    <div className="mt-1 bg-info/10 p-2 rounded text-info">
                      <Play size={16} fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-primary font-bold text-sm">{workflow.name}</div>
                      <div className="text-xs text-muted line-clamp-2 mt-1">{workflow.description}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center border border-dashed border-default rounded-lg text-muted text-sm">
                  No workflows available.
                </div>
              )}
            </div>
          </div>

          {/* New Agent Types */}
          <div className="flex flex-col gap-4">
            <div className="px-2">
              <h2 className="text-accent text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} /> New Instance
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {agentTypes.data?.map(t => (
                <button 
                  key={t.type} 
                  onClick={() => createAgent(t.type)} 
                  className="bg-tertiary border border-default p-3 rounded-lg text-sm font-medium hover:bg-hover hover:border-accent/50 transition-all cursor-pointer text-center truncate"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
