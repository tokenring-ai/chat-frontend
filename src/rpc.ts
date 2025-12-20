import AgentRpcSchema from '@tokenring-ai/agent/rpc/schema';
import FileSystemRpcSchema from '@tokenring-ai/filesystem/rpc/schema';
import WorkflowRpcSchema from '@tokenring-ai/workflow/rpc/schema';
import createJsonRPCClient from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";
import useSWR from "swr";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createJsonRPCClient(baseURL, AgentRpcSchema);
export const filesystemRPCClient = createJsonRPCClient(baseURL, FileSystemRpcSchema);
export const workflowRPCClient = createJsonRPCClient(baseURL, WorkflowRpcSchema);

export function useAgentList() {
  return useSWR("/agent/listAgents", () => agentRPCClient.listAgents({}), { refreshInterval: 1000 });
}

export function useAgentTypes() {
  return useSWR(`/agentTypes`, () => agentRPCClient.getAgentTypes({}));
}

export function useWorkflows() {
  return useSWR("/workflow/listWorkflows", () => workflowRPCClient.listWorkflows({}), { refreshInterval: 1000 });
}

export function useDirectoryListing({ path, showHidden }: { path: string, showHidden?: boolean }) {
  return useSWR(`/filesystem/listDirectory/${path}`, () => filesystemRPCClient.listDirectory({
    path,
    recursive: false,
    showHidden: showHidden ?? false
  }), {refreshInterval: 1000});
}

export function useFileContents(path: string | null) {
  return useSWR(`/filesystem/getFileContents/${path}`, () => path ? filesystemRPCClient.readFile({ path }) : null);
}

export function useSelectedFiles(agentId: string | null) {
  return useSWR(`/agent/${agentId}/selectedFiles`, () => agentId ? filesystemRPCClient.getSelectedFiles({ agentId }) : null);
}