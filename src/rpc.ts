import AgentRpcSchema from '@tokenring-ai/agent/rpc/schema';
import FileSystemRpcSchema from '@tokenring-ai/filesystem/rpc/schema';
import createJsonRPCClient from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createJsonRPCClient(baseURL, AgentRpcSchema);
export const filesystemRPCClient = createJsonRPCClient(baseURL, FileSystemRpcSchema);
