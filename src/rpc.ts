import AgentRpcSchema from '@tokenring-ai/agent/rpc/schema';
import AIClientRpcSchema from "@tokenring-ai/ai-client/rpc/schema";
import ChatRpcSchema from "@tokenring-ai/chat/rpc/schema";
import FileSystemRpcSchema from '@tokenring-ai/filesystem/rpc/schema';
import WorkflowRpcSchema from '@tokenring-ai/workflow/rpc/schema';
import createJsonRPCClient from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import useSWR from "swr";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createJsonRPCClient(baseURL, AgentRpcSchema);
export const aiRPCClient = createJsonRPCClient(baseURL, AIClientRpcSchema);
export const chatRPCClient = createJsonRPCClient(baseURL, ChatRpcSchema);
export const filesystemRPCClient = createJsonRPCClient(baseURL, FileSystemRpcSchema);
export const workflowRPCClient = createJsonRPCClient(baseURL, WorkflowRpcSchema);

export function useAvailableCommands(agentId: string) {
  return useSWR(`/agent/getAvailableCommands/${agentId}`, () => agentId ? agentRPCClient.getAvailableCommands({ agentId }) : null);
}

export function useCommandHistory(agentId: string) {
  return useSWR(`/agent/getCommandHistory/${agentId}`, () => agentId ? agentRPCClient.getCommandHistory({ agentId }) : null);
}

export function useAgentList() {
  return useSWR("/agent/listAgents", () => agentRPCClient.listAgents({}), { refreshInterval: 1000 });
}

export function useAgent(agentId: string) {
  return useSWR(`/agent/getAgent/${agentId}`, () => agentId ? agentRPCClient.getAgent({ agentId }) : null, { refreshInterval: 15000 });
}

export function useModel(agentId: string) {
  return useSWR(`/chat/model/${agentId}`, () => agentId ? chatRPCClient.getModel({ agentId }) : null, { refreshInterval: 1000 });
}

export function useAgentTypes() {
  return useSWR(`/agentTypes`, () => agentRPCClient.getAgentTypes({}));
}

export function useWorkflows() {
  return useSWR("/workflow/listWorkflows", () => workflowRPCClient.listWorkflows({}), { refreshInterval: 1000 });
}

export function useDirectoryListing(opts?: { path: string, showHidden?: boolean, agentId: string }) {
  return useSWR(`/filesystem/listDirectory/${opts!.path}`, () => opts ? filesystemRPCClient.listDirectory({
    path: opts!.path,
    recursive: false,
    showHidden: opts!.showHidden ?? false,
    agentId: opts!.agentId
  }) : null, {refreshInterval: 1000});
}

export function useFileContents(path: string | null, agentId: string | null) {
  return useSWR(`/filesystem/getFileContents/${path}`, () => path && agentId? filesystemRPCClient.readTextFile({ path, agentId }) : null);
}

export function useSelectedFiles(agentId: string | null) {
  return useSWR(`/agent/${agentId}/selectedFiles`, () => agentId ? filesystemRPCClient.getSelectedFiles({ agentId }) : null);
}

export function useChatModelsByProvider() {
  return useSWR(`/ai-client/chatModelsByProvider`, () => aiRPCClient.listChatModelsByProvider({}), { refreshInterval: 5000 });
}

export function useAvailableTools(agentId: string) {
  return useSWR(`/chat/getAvailableTools`, () => chatRPCClient.getAvailableTools({}), { refreshInterval: 5000 });
}

export function useEnabledTools(agentId: string) {
  return useSWR(`/chat/getEnabledTools/${agentId}`, () => agentId ? chatRPCClient.getEnabledTools({ agentId }) : null, { refreshInterval: 5000 });
}

export function useEnableTool(agentId: string) {
  return useSWR(`/chat/enableTools/${agentId}`, () => agentId ? chatRPCClient.enableTools({ agentId, tools: [] }) : null, { refreshInterval: 5000 });
}

export function useDisableTool(agentId: string) {
  return useSWR(`/chat/disableTools/${agentId}`, () => agentId ? chatRPCClient.disableTools({ agentId, tools: [] }) : null, { refreshInterval: 5000 });
}

export function useSetEnabledTools(agentId: string) {
  return useSWR(`/chat/setEnabledTools/${agentId}`, () => agentId ? chatRPCClient.setEnabledTools({ agentId, tools: [] }) : null, { refreshInterval: 5000 });
}
