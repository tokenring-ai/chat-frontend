import { AgentRpcSchemas } from '@tokenring-ai/agent/rpc/types';
import { FileSystemRpcSchemas } from '@tokenring-ai/filesystem/rpc/types';
import createJsonRPCClient from "@tokenring-ai/web-host/jsonrpc/createJsonRPCClient";

export const agentRPCClient = createJsonRPCClient(AgentRpcSchemas);
export const filesystemRPCClient = createJsonRPCClient(FileSystemRpcSchemas);
