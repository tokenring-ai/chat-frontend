import AgentRpcSchema from '@tokenring-ai/agent/rpc/schema';
import AIClientRpcSchema from "@tokenring-ai/ai-client/rpc/schema";
import AppRpcSchema from '@tokenring-ai/app/rpc/schema';
import BlogRpcSchema from '@tokenring-ai/blog/rpc/schema';
import ChatRpcSchema from "@tokenring-ai/chat/rpc/schema";
import CheckpointRpcSchema from "@tokenring-ai/checkpoint/rpc/schema";
import CloudQuoteRpcSchema from '@tokenring-ai/cloudquote/rpc/schema';
import FileSystemRpcSchema from '@tokenring-ai/filesystem/rpc/schema';
import LifecycleRpcSchema from '@tokenring-ai/lifecycle/rpc/schema';
import NewsRPMRpcSchema from '@tokenring-ai/newsrpm/rpc/schema';
import type {IndexedDataSearch} from "@tokenring-ai/newsrpm/schema";
import createWsRPCClient from "@tokenring-ai/web-host/createWsRPCClient";
import WorkflowRpcSchema from '@tokenring-ai/workflow/rpc/schema';
import TerminalRpcSchema from '../../../pkg/terminal/rpc/schema.ts';
import useSWR from "swr";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createWsRPCClient(baseURL, AgentRpcSchema);
export const blogRPCClient = createWsRPCClient(baseURL, BlogRpcSchema);
export const appRPCClient = createWsRPCClient(baseURL, AppRpcSchema);
export const cloudquoteRPCClient = createWsRPCClient(baseURL, CloudQuoteRpcSchema);
export const newsrpmRPCClient = createWsRPCClient(baseURL, NewsRPMRpcSchema);
export const aiRPCClient = createWsRPCClient(baseURL, AIClientRpcSchema);
export const chatRPCClient = createWsRPCClient(baseURL, ChatRpcSchema);
export const checkpointRPCClient = createWsRPCClient(baseURL, CheckpointRpcSchema);
export const filesystemRPCClient = createWsRPCClient(baseURL, FileSystemRpcSchema);
export const lifecycleRPCClient = createWsRPCClient(baseURL, LifecycleRpcSchema);
export const workflowRPCClient = createWsRPCClient(baseURL, WorkflowRpcSchema);
export const terminalRPCClient = createWsRPCClient(baseURL, TerminalRpcSchema);

export function useAvailableCommands(agentId: string) {
  return useSWR(`/agent/getAvailableCommands/${agentId}`, () => agentId ? agentRPCClient.getAvailableCommands({ agentId }) : null);
}

export function useCommandHistory(agentId: string) {
  return useSWR(`/agent/getCommandHistory/${agentId}`, () => agentId ? agentRPCClient.getCommandHistory({ agentId }) : null);
}

export function useAgentList() {
  return useSWR("/agent/listAgents", () => agentRPCClient.listAgents({}), { refreshInterval: 1000 });
}

export function useTerminalList(agentId?: string) {
  const key = agentId ? `/terminal/list/${agentId}` : '/terminal/list';
  return useSWR(
    key,
    () => agentId ? terminalRPCClient.listTerminals({ agentId }) : terminalRPCClient.listTerminals({}),
    { refreshInterval: 1200 },
  );
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

export function useFilesystemProviders() {
  return useSWR('/filesystem/getFilesystemProviders', () => filesystemRPCClient.getFilesystemProviders({}));
}

export function useFilesystemState(agentId: string | null) {
  return useSWR(`/agent/${agentId}/filesystemState`, () => agentId ? filesystemRPCClient.getFilesystemState({ agentId }) : null, { refreshInterval: 3000 });
}

export function useDirectoryListing(opts?: { path: string, showHidden?: boolean, provider: string }) {
  return useSWR(opts ? `/filesystem/listDirectory/${opts.provider}/${opts.path}` : null, () => opts ? filesystemRPCClient.listDirectory({
    path: opts.path,
    recursive: false,
    showHidden: opts.showHidden ?? false,
    provider: opts.provider
  }) : null, {refreshInterval: 5000});
}

export function useFileContents(path: string | null, provider: string | null) {
  return useSWR(`/filesystem/getFileContents/${provider}/${path}`, () => path && provider ? filesystemRPCClient.readTextFile({ path, provider }) : null);
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

export function useStockQuote(symbols: string[]) {
  const key = symbols.length ? `/cloudquote/getQuote/${symbols.join(',')}` : null;
  return useSWR(key, () => cloudquoteRPCClient.getQuote({symbols}), {refreshInterval: 30000});
}

export function useStockPriceHistory(symbol: string | null, from?: string, to?: string) {
  return useSWR(
    symbol ? `/cloudquote/getPriceHistory/${symbol}/${from ?? ''}/${to ?? ''}` : null,
    () => cloudquoteRPCClient.getPriceHistory({symbol: symbol!, from, to}),
  );
}

export function useStockPriceTicks(symbol: string | null) {
  return useSWR(
    symbol ? `/cloudquote/getPriceTicks/${symbol}` : null,
    () => cloudquoteRPCClient.getPriceTicks({symbol: symbol!}),
    {refreshInterval: 60000},
  );
}

export function useStockLeaders(list: "MOSTACTIVE" | "PERCENTGAINERS" | "PERCENTLOSERS", limit = 10) {
  return useSWR(
    `/cloudquote/getLeaders/${list}`,
    () => cloudquoteRPCClient.getLeaders({list, limit}),
    {refreshInterval: 60000},
  );
}

export function useNewsRPMIndexedDataSearchResults(search: IndexedDataSearch | null) {
  const cacheKey = search ? [
    search.key,
    ...(Array.isArray(search.value) ? search.value : [search.value]),
    search.minDate,
    search.maxDate,
    search.offset,
    search.count,
    search.order
  ].join("|") : "null";

  return useSWR(cacheKey, () => search ? newsrpmRPCClient.searchIndexedData(search) : null);
}

export function usePlugins() {
  return useSWR("/app/listPlugins", () => appRPCClient.listPlugins({}));
}

export function useCheckpointList() {
  return useSWR("/checkpoint/listCheckpoints", () => checkpointRPCClient.listCheckpoints({}), { refreshInterval: 5000 });
}

export function useBlogPosts(provider: string | null, status: 'all' | 'draft' | 'published' = 'all', limit = 50) {
  return useSWR(
    provider ? `/blog/getAllPosts/${provider}/${status}` : null,
    () => provider ? blogRPCClient.getAllPosts({provider, status, limit}) : null,
    {refreshInterval: 30000}
  );
}

export function useBlogPost(provider: string | null, id: string | null) {
  return useSWR(
    provider && id ? `/blog/getPost/${provider}/${id}` : null,
    () => provider && id ? blogRPCClient.getPostById({provider, id}) : null,
    {}
  );
}

export function useBlogState(agentId: string | null) {
  return useSWR(
    agentId ? `/blog/getBlogState/${agentId}` : null,
    () => agentId ? blogRPCClient.getBlogState({agentId}) : null,
  );
}
