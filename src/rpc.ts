import AgentRpcSchema from '@tokenring-ai/agent/rpc/schema';
import AIClientRpcSchema from "@tokenring-ai/ai-client/rpc/schema";
import ChatRpcSchema from "@tokenring-ai/chat/rpc/schema";
import CheckpointRpcSchema from "@tokenring-ai/checkpoint/rpc/schema";
import FileSystemRpcSchema from '@tokenring-ai/filesystem/rpc/schema';
import LifecycleRpcSchema from '@tokenring-ai/lifecycle/rpc/schema';
import WorkflowRpcSchema from '@tokenring-ai/workflow/rpc/schema';
import createWsRPCClient from "@tokenring-ai/web-host/createWsRPCClient";
import useSWR from "swr";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createWsRPCClient(baseURL, AgentRpcSchema);
export const aiRPCClient = createWsRPCClient(baseURL, AIClientRpcSchema);
export const chatRPCClient = createWsRPCClient(baseURL, ChatRpcSchema);
export const checkpointRPCClient = createWsRPCClient(baseURL, CheckpointRpcSchema);
export const filesystemRPCClient = createWsRPCClient(baseURL, FileSystemRpcSchema);
export const lifecycleRPCClient = createWsRPCClient(baseURL, LifecycleRpcSchema);
export const workflowRPCClient = createWsRPCClient(baseURL, WorkflowRpcSchema);

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
  return useSWR(`/chat/model/${agentId}`, () => agentId ? chatRPCClient.getModel({ agentId }) : null, { refreshInterval: 15000 });
}

export function useAgentTypes() {
  return useSWR(`/agentTypes`, () => agentRPCClient.getAgentTypes({}));
}

export function useWorkflows() {
  return useSWR("/workflow/listWorkflows", () => workflowRPCClient.listWorkflows({}));
}

export function useDirectoryListing(opts?: { path: string, showHidden?: boolean, agentId: string }) {
  return useSWR(opts ? `/filesystem/listDirectory/${opts.path}` : null, () => opts ? filesystemRPCClient.listDirectory({
    path: opts.path,
    recursive: false,
    showHidden: opts.showHidden ?? false,
    agentId: opts.agentId
  }) : null, {refreshInterval: 5000});
}

export function useFileContents(path: string | null, agentId: string | null) {
  return useSWR(`/filesystem/getFileContents/${path}`, () => path && agentId? filesystemRPCClient.readTextFile({ path, agentId }) : null);
}

export function useSelectedFiles(agentId: string | null) {
  return useSWR(`/agent/${agentId}/selectedFiles`, () => agentId ? filesystemRPCClient.getSelectedFiles({ agentId }) : null);
}

export function useChatModelsByProvider() {
  return useSWR(`/ai-client/chatModelsByProvider`, () => aiRPCClient.listChatModelsByProvider({}));
}

export function useAvailableTools() {
  return useSWR(`/chat/getAvailableTools`, () => chatRPCClient.getAvailableTools({}));
}

export function useEnabledTools(agentId: string) {
  return useSWR(`/chat/getEnabledTools/${agentId}`, () => agentId ? chatRPCClient.getEnabledTools({ agentId }) : null, { refreshInterval: 5000 });
}

export function useAvailableHooks() {
  return useSWR(`/lifecycle/getAvailableHooks`, () => lifecycleRPCClient.getAvailableHooks({}));
}

export function useEnabledHooks(agentId: string) {
  return useSWR(`/lifecycle/getEnabledHooks/${agentId}`, () => agentId ? lifecycleRPCClient.getEnabledHooks({ agentId }) : null, { refreshInterval: 5000 });
}

export function useAvailableSubAgents(agentId: string) {
  return useSWR(`/agent/getAvailableSubAgents/${agentId}`, () => agentId ? agentRPCClient.getAvailableSubAgents({ agentId }) : null);
}

export function useEnabledSubAgents(agentId: string) {
  return useSWR(`/agent/getEnabledSubAgents/${agentId}`, () => agentId ? agentRPCClient.getEnabledSubAgents({ agentId }) : null, { refreshInterval: 5000 });
}

export function useCheckpointList() {
  return useSWR("/checkpoint/listCheckpoints", () => checkpointRPCClient.listCheckpoints({}), { refreshInterval: 5000 });
}
