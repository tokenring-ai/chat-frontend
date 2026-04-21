import AgentRpcSchema from "@tokenring-ai/agent/rpc/schema";
import AIClientRpcSchema from "@tokenring-ai/ai-client/rpc/schema";
import AppRpcSchema from "@tokenring-ai/app/rpc/schema";
import BlogRpcSchema from "@tokenring-ai/blog/rpc/schema";
import CalendarRpcSchema from "@tokenring-ai/calendar/rpc/schema";
import ChatRpcSchema from "@tokenring-ai/chat/rpc/schema";
import CheckpointRpcSchema from "@tokenring-ai/checkpoint/rpc/schema";
import CloudQuoteRpcSchema from "@tokenring-ai/cloudquote/rpc/schema";
import EmailRpcSchema from "@tokenring-ai/email/rpc/schema";
import FileSystemRpcSchema from "@tokenring-ai/filesystem/rpc/schema";
import ImageGenerationRpcSchema from "@tokenring-ai/image-generation/rpc/schema";
import LifecycleRpcSchema from "@tokenring-ai/lifecycle/rpc/schema";
import NewsRPMRpcSchema from "@tokenring-ai/newsrpm/rpc/schema";
import type { IndexedDataSearch } from "@tokenring-ai/newsrpm/schema";
import TasksRpcSchema from "@tokenring-ai/tasks/rpc/schema";
import TerminalRpcSchema from "@tokenring-ai/terminal/rpc/schema";
import { arrayableToArray } from "@tokenring-ai/utility/array/arrayable";
import { stripUndefinedKeys } from "@tokenring-ai/utility/object/stripObject";
import VaultRpcSchema from "@tokenring-ai/vault/rpc/schema";
import createWsRPCClient from "@tokenring-ai/web-host/createWsRPCClient";
import WorkflowRpcSchema from "@tokenring-ai/workflow/rpc/schema";
import useSWR from "swr";

const baseURL = new URL(window.location.origin);

export const agentRPCClient = createWsRPCClient(baseURL, AgentRpcSchema);
export const blogRPCClient = createWsRPCClient(baseURL, BlogRpcSchema);
export const imageGenerationRPCClient = createWsRPCClient(baseURL, ImageGenerationRpcSchema);
export const appRPCClient = createWsRPCClient(baseURL, AppRpcSchema);
export const cloudquoteRPCClient = createWsRPCClient(baseURL, CloudQuoteRpcSchema);
export const newsrpmRPCClient = createWsRPCClient(baseURL, NewsRPMRpcSchema);
export const aiRPCClient = createWsRPCClient(baseURL, AIClientRpcSchema);
export const chatRPCClient = createWsRPCClient(baseURL, ChatRpcSchema);
export const checkpointRPCClient = createWsRPCClient(baseURL, CheckpointRpcSchema);
export const filesystemRPCClient = createWsRPCClient(baseURL, FileSystemRpcSchema);
export const lifecycleRPCClient = createWsRPCClient(baseURL, LifecycleRpcSchema);
export const workflowRPCClient = createWsRPCClient(baseURL, WorkflowRpcSchema);
export const calendarRPCClient = createWsRPCClient(baseURL, CalendarRpcSchema);
export const emailRPCClient = createWsRPCClient(baseURL, EmailRpcSchema);
export const terminalRPCClient = createWsRPCClient(baseURL, TerminalRpcSchema);
export const vaultRPCClient = createWsRPCClient(baseURL, VaultRpcSchema);
export const tasksRPCClient = createWsRPCClient(baseURL, TasksRpcSchema);

export function useAvailableCommands(agentId: string) {
  return useSWR(`/agent/getAvailableCommands/${agentId}`, async () => {
    if (!agentId) return null;
    const result = await agentRPCClient.getAvailableCommands({ agentId });
    return result.status === "success" ? result.commands : null;
  });
}

export function useCommandHistory(agentId: string) {
  return useSWR(`/agent/getCommandHistory/${agentId}`, async () => {
    if (!agentId) return null;
    const result = await agentRPCClient.getCommandHistory({ agentId });
    return result.status === "success" ? result.history : null;
  });
}

export function useAgentList() {
  return useSWR("/agent/listAgents", () => agentRPCClient.listAgents({}), { refreshInterval: 1000 });
}

export function useTerminalList(agentId?: string) {
  const key = agentId ? `/terminal/list/${agentId}` : "/terminal/list";
  return useSWR(key, () => (agentId ? terminalRPCClient.listTerminals({ agentId }) : terminalRPCClient.listTerminals({})), { refreshInterval: 1200 });
}

export function useModel(agentId: string) {
  return useSWR(`/chat/model/${agentId}`, () => (agentId ? chatRPCClient.getModel({ agentId }) : null), { refreshInterval: 15000 });
}

export function useAgentTypes() {
  return useSWR(`/agentTypes`, () => agentRPCClient.getAgentTypes({}));
}

export function useWorkflows() {
  return useSWR("/workflow/listWorkflows", () => workflowRPCClient.listWorkflows({}));
}

export function useFilesystemProviders() {
  return useSWR("/filesystem/getFilesystemProviders", () => filesystemRPCClient.getFilesystemProviders({}));
}

export function useFilesystemState(agentId: string | undefined) {
  return useSWR(`/agent/${agentId}/filesystemState`, () => (agentId ? filesystemRPCClient.getFilesystemState({ agentId }) : null), { refreshInterval: 3000 });
}

export function useDirectoryListing(opts?: { path: string; showHidden?: boolean; provider: string }) {
  return useSWR(
    opts ? `/filesystem/listDirectory/${opts.provider}/${opts.path}` : null,
    () =>
      opts
        ? filesystemRPCClient.listDirectory({
            path: opts.path,
            recursive: false,
            showHidden: opts.showHidden ?? false,
            provider: opts.provider,
          })
        : null,
    { refreshInterval: 5000 },
  );
}

export function useFileContents(path: string | undefined, provider: string | undefined) {
  return useSWR(`/filesystem/getFileContents/${provider}/${path}`, () => (path && provider ? filesystemRPCClient.readTextFile({ path, provider }) : null));
}

export function useChatModelsByProvider() {
  return useSWR(`/ai-client/chatModelsByProvider`, () => aiRPCClient.listChatModelsByProvider({}));
}

export function useAvailableTools() {
  return useSWR(`/chat/getAvailableTools`, () => chatRPCClient.getAvailableTools({}));
}

export function useEnabledTools(agentId: string) {
  return useSWR(`/chat/getEnabledTools/${agentId}`, () => (agentId ? chatRPCClient.getEnabledTools({ agentId }) : null), { refreshInterval: 5000 });
}

export function useAvailableHooks() {
  return useSWR(`/lifecycle/getAvailableHooks`, () => lifecycleRPCClient.getAvailableHooks({}));
}

export function useEnabledHooks(agentId: string) {
  return useSWR(`/lifecycle/getEnabledHooks/${agentId}`, () => (agentId ? lifecycleRPCClient.getEnabledHooks({ agentId }) : null), { refreshInterval: 5000 });
}

export function useAvailableSubAgents(agentId: string) {
  return useSWR(`/agent/getAvailableSubAgents/${agentId}`, () => (agentId ? agentRPCClient.getAgentTypes({}).then(agents => ({ agents })) : null));
}

export function useEnabledSubAgents(agentId: string) {
  return useSWR(`/tasks/getEnabledSubAgents/${agentId}`, () => (agentId ? tasksRPCClient.getEnabledSubAgents({ agentId }) : null), { refreshInterval: 5000 });
}

export function useStockQuote(symbols: string[]) {
  const key = symbols.length ? `/cloudquote/getQuote/${symbols.join(",")}` : null;
  return useSWR(key, () => cloudquoteRPCClient.getQuote({ symbols }), { refreshInterval: 30000 });
}

export function useStockPriceHistory(symbol: string | undefined, from?: string, to?: string) {
  return useSWR(symbol ? `/cloudquote/getPriceHistory/${symbol}/${from ?? ""}/${to ?? ""}` : null, () =>
    cloudquoteRPCClient.getPriceHistory(stripUndefinedKeys({ symbol: symbol!, from, to })),
  );
}

export function useStockPriceTicks(symbol: string | undefined) {
  return useSWR(symbol ? `/cloudquote/getPriceTicks/${symbol}` : null, () => cloudquoteRPCClient.getPriceTicks({ symbol: symbol! }), {
    refreshInterval: 60000,
  });
}

export function useStockLeaders(list: "MOSTACTIVE" | "PERCENTGAINERS" | "PERCENTLOSERS", limit = 10) {
  return useSWR(`/cloudquote/getLeaders/${list}`, () => cloudquoteRPCClient.getLeaders({ list, limit }), { refreshInterval: 60000 });
}

export function useNewsRPMIndexedDataSearchResults(search: IndexedDataSearch | undefined) {
  const cacheKey = search
    ? [search.key, ...arrayableToArray(search.value), search.minDate, search.maxDate, search.offset, search.count, search.order].join("|")
    : "null";

  return useSWR(cacheKey, () => (search ? newsrpmRPCClient.searchIndexedData(search) : null));
}

export function usePlugins() {
  return useSWR("/app/listPlugins", () => appRPCClient.listPlugins({}));
}

export function useCheckpointList() {
  return useSWR("/checkpoint/listCheckpoints", () => checkpointRPCClient.listCheckpoints({}), { refreshInterval: 5000 });
}

export function useBlogPosts(provider: string | undefined, status: "all" | "draft" | "published" = "all", limit = 50) {
  return useSWR(provider ? `/blog/getAllPosts/${provider}/${status}` : null, () => (provider ? blogRPCClient.getAllPosts({ provider, status, limit }) : null), {
    refreshInterval: 30000,
  });
}

export function useBlogPost(provider: string | undefined, id: string | undefined) {
  return useSWR(provider && id ? `/blog/getPost/${provider}/${id}` : null, () => (provider && id ? blogRPCClient.getPostById({ provider, id }) : null), {});
}

export function useBlogState(agentId: string | undefined) {
  return useSWR(agentId ? `/blog/getBlogState/${agentId}` : null, () => (agentId ? blogRPCClient.getBlogState({ agentId }) : null));
}

export function useCalendarProviders() {
  return useSWR("/calendar/getCalendarProviders", () => calendarRPCClient.getCalendarProviders({}), { refreshInterval: 10000 });
}

export function useCalendarEvents(provider: string | undefined, from: string, to: string) {
  return useSWR(
    provider ? `/calendar/getUpcomingEvents/${provider}/${from}/${to}` : null,
    () => calendarRPCClient.getUpcomingEvents({ provider: provider!, from, to }),
    { refreshInterval: 30000 },
  );
}

export function useEmailProviders() {
  return useSWR("/email/getEmailProviders", () => emailRPCClient.getEmailProviders({}), { refreshInterval: 10000 });
}

export function useEmailBoxes(provider: string | undefined) {
  return useSWR(provider ? `/email/getEmailBoxes/${provider}` : null, () => emailRPCClient.getEmailBoxes({ provider: provider! }), { refreshInterval: 30000 });
}

export function useEmailMessages(
  provider: string | undefined,
  opts?: {
    box?: string | undefined;
    limit?: number | undefined;
    unreadOnly?: boolean | undefined;
    pageToken?: string | undefined;
  },
) {
  const box = opts?.box ?? "inbox";
  const limit = opts?.limit ?? 50;
  const unreadOnly = opts?.unreadOnly ?? false;
  const pageToken = opts?.pageToken;
  return useSWR(
    provider ? `/email/getMessages/${provider}/${box}/${limit}/${unreadOnly}/${pageToken ?? ""}` : null,
    () => emailRPCClient.getMessages(stripUndefinedKeys({ provider, box, limit, unreadOnly, pageToken })),
    { refreshInterval: 30000 },
  );
}

export function useEmailSearch(provider: string | undefined, query: string | undefined, opts?: { box?: string; limit?: number; unreadOnly?: boolean }) {
  const box = opts?.box ?? "inbox";
  const limit = opts?.limit ?? 50;
  const unreadOnly = opts?.unreadOnly ?? false;
  return useSWR(
    provider && query ? `/email/searchMessages/${provider}/${box}/${query}/${limit}/${unreadOnly}` : null,
    () => emailRPCClient.searchMessages(stripUndefinedKeys({ provider, query, box, limit, unreadOnly })),
    { refreshInterval: 30000 },
  );
}

export function useEmailMessage(provider: string | undefined, messageId: string | undefined) {
  return useSWR(provider && messageId ? `/email/getMessageById/${provider}/${messageId}` : null, () =>
    emailRPCClient.getMessageById(stripUndefinedKeys({ provider: provider, id: messageId })),
  );
}

export function useVaultKeys() {
  return useSWR("/vault/listEntries", () => vaultRPCClient.listEntries({}), { refreshInterval: 10000 });
}

export function useImages(search?: string, limit?: number) {
  const key = search ? `/image-generation/getImages/${search}/${limit ?? 200}` : `/image-generation/getImages/${limit ?? 200}`;
  return useSWR(key, () => imageGenerationRPCClient.getImages(stripUndefinedKeys({ search, limit })), { refreshInterval: 10000 });
}

export function useImageGenerationModels() {
  return useSWR("/ai-client/listImageGenerationModels", () => aiRPCClient.listImageGenerationModels({}));
}
