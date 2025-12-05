import { AgentRpcSchemas} from '@tokenring-ai/agent/rpc/types';
import createJsonRPCClient from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";

export const agentRPCClient = createJsonRPCClient(AgentRpcSchemas);



/*
let rpcId = 0;

async function rpcCall<K extends keyof AgentRpcTypes>(
  method: K,
  params: AgentRpcTypes[K]['input']
): Promise<AgentRpcTypes[K]['result']> {
  const response = await fetch('/rpc/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method,
      params,
    }),
  });
  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  return result.result;
}

export const listAgents = () => rpcCall('listAgents', {});
export const getAgentEvents = (agentId: string, fromPosition: number) => 
  rpcCall('getAgentEvents', { agentId, fromPosition });
export const createAgent = (agentType: string, headless: boolean) => 
  rpcCall('createAgent', { agentType, headless });
export const sendInput = (agentId: string, message: string) => 
  rpcCall('sendInput', { agentId, message });
export const sendHumanResponse = (agentId: string, requestId: string, response: string) => 
  rpcCall('sendHumanResponse', { agentId, requestId, response });

*/