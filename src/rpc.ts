import AgentRpcSchema from "@tokenring-ai/agent/rpc/schema";
import AIClientRpcSchema from "@tokenring-ai/ai-client/rpc/schema";
import AppRpcSchema from "@tokenring-ai/app/rpc/schema";
import AudioRpcSchema from "@tokenring-ai/audio/rpc/schema";
import BlogRpcSchema from "@tokenring-ai/blog/rpc/schema";
import CalendarRpcSchema from "@tokenring-ai/calendar/rpc/schema";
import ChatRpcSchema from "@tokenring-ai/chat/rpc/schema";
import CheckpointRpcSchema from "@tokenring-ai/checkpoint/rpc/schema";
import CloudQuoteRpcSchema from "@tokenring-ai/cloudquote/rpc/schema";
import EmailRpcSchema from "@tokenring-ai/email/rpc/schema";
import FileSystemRpcSchema from "@tokenring-ai/filesystem/rpc/schema";
import ImageGenerationRpcSchema from "@tokenring-ai/image/rpc/schema";
import LifecycleRpcSchema from "@tokenring-ai/lifecycle/rpc/schema";
import NewsRPMRpcSchema from "@tokenring-ai/newsrpm/rpc/schema";
import type { IndexedDataSearch } from "@tokenring-ai/newsrpm/schema";
import TasksRpcSchema from "@tokenring-ai/tasks/rpc/schema";
import TerminalRpcSchema from "@tokenring-ai/terminal/rpc/schema";
import { arrayableToArray } from "@tokenring-ai/utility/array/arrayable";
import { stripUndefinedKeys } from "@tokenring-ai/utility/object/stripObject";
import VaultRpcSchema from "@tokenring-ai/vault/rpc/schema";
import VideoRpcSchema from "@tokenring-ai/video/rpc/schema";
import createWsRPCClient from "@tokenring-ai/web-host/createWsRPCClient";
import WorkflowRpcSchema from "@tokenring-ai/workflow/rpc/schema";
import useSWR, { Fetcher, Key, SWRConfiguration, SWRResponse } from "swr";

export function useTypedSWR<Data = any, Err extends Error = Error, SWRKey extends Key = Key>(
  key: SWRKey,
  fetcher: Fetcher<Data, SWRKey> | null,
  config?: SWRConfiguration<Data, Err, Fetcher<Data, SWRKey>>
): SWRResponse<Data, Err> {
  return useSWR<Data, Err, SWRKey>(key, fetcher, config);
}

const baseURL = new URL("/rpc:ws", window.location.origin);

export const agentRPCClient = createWsRPCClient(baseURL, AgentRpcSchema);
export const audioRPCClient = createWsRPCClient(baseURL, AudioRpcSchema);
export const blogRPCClient = createWsRPCClient(baseURL, BlogRpcSchema);
export const imageGenerationRPCClient = createWsRPCClient(baseURL, ImageGenerationRpcSchema);
export const videoGenerationRPCClient = createWsRPCClient(baseURL, VideoRpcSchema);
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
  return useTypedSWR(agentId ? `/agent/getAvailableCommands/${agentId}` : null, async () => {
    const result = await agentRPCClient.getAvailableCommands({ agentId });
    return result.status === "success" ? result.commands : null;
  });
}

export function useCommandHistory(agentId: string) {
  return useTypedSWR(agentId ? `/agent/getCommandHistory/${agentId}` : null, async () => {
    const result = await agentRPCClient.getCommandHistory({ agentId });
    return result.status === "success" ? result.history : null;
  });
}

export function useAgentList() {
  return useTypedSWR("/agent/listAgents", () => agentRPCClient.listAgents({}), { refreshInterval: 1000 });
}

export function useTerminalList(agentId?: string) {
  const key = agentId ? `/terminal/list/${agentId}` : "/terminal/list";
  return useTypedSWR(key, () => (agentId ? terminalRPCClient.listTerminals({ agentId }) : terminalRPCClient.listTerminals({})), { refreshInterval: 1200 });
}

export function useModel(agentId: string) {
  return useTypedSWR(agentId ? `/chat/model/${agentId}` : null, () => chatRPCClient.getModel({ agentId }), { refreshInterval: 15000 });
}

export function useAgentTypes() {
  return useTypedSWR(`/agentTypes`, () => agentRPCClient.getAgentTypes({}));
}

export function useWorkflows() {
  return useTypedSWR("/workflow/listWorkflows", () => workflowRPCClient.listWorkflows({}));
}

export function useFilesystemProviders() {
  return useTypedSWR("/filesystem/getFilesystemProviders", () => filesystemRPCClient.getFilesystemProviders({}));
}

export function useFilesystemState(agentId: string | undefined) {
  return useTypedSWR(agentId ? `/agent/${agentId}/filesystemState` : null, () => filesystemRPCClient.getFilesystemState({ agentId: agentId! }), { refreshInterval: 3000 });
}

export function useDirectoryListing(opts?: { path: string; showHidden?: boolean; provider: string }) {
  return useTypedSWR(
    opts ? `/filesystem/listDirectory/${opts.provider}/${opts.path}` : null,
    () =>
      filesystemRPCClient.listDirectory({
        path: opts!.path,
        recursive: false,
        showHidden: opts!.showHidden ?? false,
        provider: opts!.provider,
      }),
    { refreshInterval: 5000 },
  );
}

export function useFileContents(path: string | undefined, provider: string | undefined) {
  return useTypedSWR(path && provider ? `/filesystem/getFileContents/${provider}/${path}` : null, () => filesystemRPCClient.readTextFile({
    path: path!,
    provider: provider!
  }));
}

export function useChatModelsByProvider() {
  return useTypedSWR(`/ai-client/chatModelsByProvider`, () => aiRPCClient.listChatModelsByProvider({}));
}

export function useAvailableTools() {
  return useTypedSWR(`/chat/getAvailableTools`, () => chatRPCClient.getAvailableTools({}));
}

export function useEnabledTools(agentId: string) {
  return useTypedSWR(agentId ? `/chat/getEnabledTools/${agentId}` : null, () => chatRPCClient.getEnabledTools({ agentId }), { refreshInterval: 5000 });
}

export function useAvailableHooks() {
  return useTypedSWR(`/lifecycle/getAvailableHooks`, () => lifecycleRPCClient.getAvailableHooks({}));
}

export function useEnabledHooks(agentId: string) {
  return useTypedSWR(agentId ? `/lifecycle/getEnabledHooks/${agentId}` : null, () => lifecycleRPCClient.getEnabledHooks({ agentId }), { refreshInterval: 5000 });
}

export function useAvailableSubAgents(agentId: string) {
  return useTypedSWR(agentId ? `/agent/getAvailableSubAgents/${agentId}` : null, () => agentRPCClient.getAgentTypes({}).then(agents => ({ agents })));
}

export function useEnabledSubAgents(agentId: string) {
  return useTypedSWR(agentId ? `/tasks/getEnabledSubAgents/${agentId}` : null, () => tasksRPCClient.getEnabledSubAgents({ agentId }), { refreshInterval: 5000 });
}

export function useStockQuote(symbols: string[]) {
  const key = symbols.length ? `/cloudquote/getQuote/${symbols.join(",")}` : null;
  return useTypedSWR(key, () => cloudquoteRPCClient.getQuote({ symbols }), { refreshInterval: 30000 });
}

export function useStockPriceHistory(symbol: string | undefined, from?: string, to?: string) {
  return useTypedSWR(symbol ? `/cloudquote/getPriceHistory/${symbol}/${from ?? ""}/${to ?? ""}` : null, () =>
    cloudquoteRPCClient.getPriceHistory(stripUndefinedKeys({ symbol: symbol!, from, to })),
  );
}

export function useStockPriceTicks(symbol: string | undefined) {
  return useTypedSWR(symbol ? `/cloudquote/getPriceTicks/${symbol}` : null, () => cloudquoteRPCClient.getPriceTicks({ symbol: symbol! }), {
    refreshInterval: 60000,
  });
}

export function useStockLeaders(list: "MOSTACTIVE" | "PERCENTGAINERS" | "PERCENTLOSERS", limit = 10) {
  return useTypedSWR(`/cloudquote/getLeaders/${list}`, () => cloudquoteRPCClient.getLeaders({ list, limit }), { refreshInterval: 60000 });
}

export function useFindStock(search: string | undefined, limit = 10) {
  const trimmed = search?.trim();
  return useTypedSWR(trimmed ? `/cloudquote/findStock/${trimmed}/${limit}` : null, () => cloudquoteRPCClient.findStock({ search: trimmed!, limit }), {
    dedupingInterval: 300,
  });
}

export function useNewsRPMIndexedDataSearchResults(search: IndexedDataSearch | undefined) {
  const cacheKey = search
    ? [search.key, ...arrayableToArray(search.value), search.minDate, search.maxDate, search.offset, search.count, search.order].join("|")
    : null;

  return useTypedSWR(cacheKey, () => newsrpmRPCClient.searchIndexedData(search!));
}

export function usePlugins() {
  return useTypedSWR("/app/listPlugins", () => appRPCClient.listPlugins({}));
}

export function useAppLogs() {
  return useTypedSWR("/app/getLogs", () => appRPCClient.getLogs({}), { refreshInterval: 2000 });
}

export function useCheckpointList() {
  return useTypedSWR("/checkpoint/listCheckpoints", () => checkpointRPCClient.listCheckpoints({}), { refreshInterval: 5000 });
}

export function useBlogPosts(provider: string | undefined, status: "all" | "draft" | "published" = "all", limit = 50) {
  return useTypedSWR(provider ? `/blog/getAllPosts/${provider}/${status}` : null, () => blogRPCClient.getAllPosts({ provider: provider!, status, limit }), {
    refreshInterval: 30000,
  });
}

export function useBlogPost(provider: string | undefined, id: string | undefined) {
  return useTypedSWR(provider && id ? `/blog/getPost/${provider}/${id}` : null, () => blogRPCClient.getPostById({ provider: provider!, id: id! }), {});
}

export function useBlogState(agentId: string | undefined) {
  return useTypedSWR(agentId ? `/blog/getBlogState/${agentId}` : null, () => blogRPCClient.getBlogState({ agentId: agentId! }));
}

export function useCalendarProviders() {
  return useTypedSWR("/calendar/getCalendarProviders", () => calendarRPCClient.getCalendarProviders({}), { refreshInterval: 10000 });
}

export function useCalendarEvents(provider: string | undefined, from: string, to: string) {
  return useTypedSWR(
    provider ? `/calendar/getUpcomingEvents/${provider}/${from}/${to}` : null,
    () => calendarRPCClient.getUpcomingEvents({ provider: provider!, from, to }),
    { refreshInterval: 30000 },
  );
}

export function useEmailProviders() {
  return useTypedSWR("/email/getEmailProviders", () => emailRPCClient.getEmailProviders({}), { refreshInterval: 10000 });
}

export function useEmailBoxes(provider: string | undefined) {
  return useTypedSWR(provider ? `/email/getEmailBoxes/${provider}` : null, () => emailRPCClient.getEmailBoxes({ provider: provider! }), { refreshInterval: 30000 });
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
  return useTypedSWR(
    provider ? `/email/getMessages/${provider}/${box}/${limit}/${unreadOnly}/${pageToken ?? ""}` : null,
    () => emailRPCClient.getMessages(stripUndefinedKeys({ provider, box, limit, unreadOnly, pageToken })),
    { refreshInterval: 30000 },
  );
}

export function useEmailSearch(provider: string | undefined, query: string | undefined, opts?: { box?: string; limit?: number; unreadOnly?: boolean }) {
  const box = opts?.box ?? "inbox";
  const limit = opts?.limit ?? 50;
  const unreadOnly = opts?.unreadOnly ?? false;
  return useTypedSWR(
    provider && query ? `/email/searchMessages/${provider}/${box}/${query}/${limit}/${unreadOnly}` : null,
    () => emailRPCClient.searchMessages(stripUndefinedKeys({ provider, query, box, limit, unreadOnly })),
    { refreshInterval: 30000 },
  );
}

export function useEmailMessage(provider: string | undefined, messageId: string | undefined) {
  return useTypedSWR(provider && messageId ? `/email/getMessageById/${provider}/${messageId}` : null, () =>
    emailRPCClient.getMessageById(stripUndefinedKeys({ provider: provider, id: messageId })),
  );
}

export function useVaultKeys() {
  return useTypedSWR("/vault/listEntries", () => vaultRPCClient.listEntries({}), { refreshInterval: 10000 });
}

export function useImages(search?: string, limit?: number) {
  const key = search ? `/image/getImages/${search}/${limit ?? 200}` : `/image/getImages/${limit ?? 200}`;
  return useTypedSWR(key, () => imageGenerationRPCClient.getImages(stripUndefinedKeys({ search, limit })), { refreshInterval: 10000 });
}

export function useImageGenerationModels() {
  return useTypedSWR("/ai-client/listImageGenerationModels", () => aiRPCClient.listImageGenerationModels({}));
}

export function useVideos(search?: string, limit?: number) {
  const key = search ? `/video/getVideos/${search}/${limit ?? 200}` : `/video/getVideos/${limit ?? 200}`;
  return useTypedSWR(key, () => videoGenerationRPCClient.getVideos(stripUndefinedKeys({ search, limit })), { refreshInterval: 10000 });
}

export function useVideoGenerationModels() {
  return useTypedSWR("/ai-client/listVideoGenerationModels", () => aiRPCClient.listVideoGenerationModels({}));
}

export function useAudios(search?: string, limit?: number) {
  const key = search ? `/audio/getAudios/${search}/${limit ?? 200}` : `/audio/getAudios/${limit ?? 200}`;
  return useTypedSWR(key, () => audioRPCClient.getAudios(stripUndefinedKeys({ search, limit })), { refreshInterval: 10000 });
}

export function useSpeechModels() {
  return useTypedSWR("/ai-client/listSpeechModels", () => aiRPCClient.listSpeechModels({}));
}