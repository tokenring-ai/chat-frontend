import type {EmailMessage} from "@tokenring-ai/email";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  WifiOff,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import ResizableSplit from '../../components/ui/ResizableSplit.tsx';
import {cn} from '../../lib/utils.ts';
import ChatPage from '../ChatPage.tsx';
import {agentRPCClient, emailRPCClient, useEmailBoxes, useEmailMessage, useEmailMessages, useEmailProviders, useEmailSearch} from '../../rpc.ts';

const BOX_META = {
  inbox: {icon: Inbox, color: 'text-blue-400'},
  starred: {icon: Star, color: 'text-amber-400'},
  sent: {icon: Send, color: 'text-green-400'},
  drafts: {icon: FileText, color: 'text-purple-400'},
  archive: {icon: Archive, color: 'text-muted'},
  trash: {icon: Trash2, color: 'text-red-400'},
  spam: {icon: AlertCircle, color: 'text-amber-500'},
} as const;

type EmailBoxRecord = {id: string; name: string};

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  if (diffDays < 7) return d.toLocaleDateString(undefined, {weekday: 'short'});
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

function senderName(msg: EmailMessage): string {
  return msg.from.name || msg.from.email;
}

function getBoxPresentation(box: EmailBoxRecord) {
  const normalized = box.id.toLowerCase();
  const meta = BOX_META[normalized as keyof typeof BOX_META] ?? {icon: Mail, color: 'text-muted'};

  return {
    ...meta,
    label: box.name,
  };
}

function ProviderSelector({
  provider,
  availableProviders,
  loading,
  onProviderChange,
}: {
  provider: string | null;
  availableProviders: string[];
  loading: boolean;
  onProviderChange: (p: string) => void | Promise<void>;
}) {
  const [changing, setChanging] = useState(false);
  const [open, setOpen] = useState(false);

  if (loading && availableProviders.length === 0) {
    return (
      <span className="text-2xs text-muted flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin"/> Loading providers
      </span>
    );
  }

  if (availableProviders.length === 0) {
    return (
      <span className="text-2xs text-muted flex items-center gap-1">
        <WifiOff className="w-3 h-3"/> No providers configured
      </span>
    );
  }

  const switchProvider = async (name: string) => {
    setChanging(true);
    setOpen(false);
    try {
      await onProviderChange(name);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={changing}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-primary rounded-lg text-xs text-muted hover:text-primary hover:border-red-500/40 transition-all focus-ring cursor-pointer disabled:opacity-50"
      >
        <Globe className="w-3 h-3"/>
        <span className="font-medium text-primary max-w-32 truncate">{provider ?? 'No provider'}</span>
        {changing ? <Loader2 className="w-3 h-3 animate-spin"/> : <ChevronDown className="w-3 h-3"/>}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-secondary border border-primary rounded-xl shadow-card z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-primary">
            <p className="text-2xs font-semibold text-muted uppercase tracking-wider">Switch Provider</p>
          </div>
          {availableProviders.map(p => (
            <button
              key={p}
              onClick={() => switchProvider(p)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-hover transition-colors cursor-pointer text-left focus-ring ${p === provider ? 'text-red-500 font-medium' : 'text-primary'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p === provider ? 'bg-red-500' : 'bg-transparent'}`}/>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderSidebar({
  boxes,
  selected,
  onSelect,
}: {
  boxes: EmailBoxRecord[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-44 shrink-0 border-r border-primary bg-secondary flex flex-col py-3">
      <p className="text-2xs font-bold text-muted uppercase tracking-widest px-4 pb-2">Folders</p>
      <nav className="space-y-0.5 px-2">
        {boxes.map(box => {
          const {label, icon: Icon, color} = getBoxPresentation(box);
          return (
          <button
            key={box.id}
            onClick={() => onSelect(box.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors focus-ring cursor-pointer text-left',
              selected === box.id ? 'bg-active text-primary' : 'hover:bg-hover text-muted hover:text-primary',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', selected === box.id ? color : 'text-muted')} />
            {label}
          </button>
          );
        })}
      </nav>
    </div>
  );
}

function MessageListItem({msg, selected, onClick}: {msg: EmailMessage; selected: boolean; onClick: () => void}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex flex-col gap-1 px-3 py-3 text-left border-b border-primary hover:bg-hover transition-colors focus-ring cursor-pointer border-l-2',
        selected ? 'bg-active border-l-red-500' : 'border-l-transparent',
      )}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs truncate flex-1 min-w-0', msg.isRead ? 'text-muted' : 'text-primary font-semibold')}>
          {senderName(msg)}
        </span>
        <span className="text-2xs text-muted shrink-0">{formatDate(msg.receivedAt)}</span>
      </div>
      <span className={cn('text-xs truncate', msg.isRead ? 'text-muted' : 'text-secondary font-medium')}>
        {msg.subject || '(no subject)'}
      </span>
      {msg.snippet && (
        <span className="text-2xs text-muted truncate">{msg.snippet}</span>
      )}
      {!msg.isRead && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute right-3 top-3"/>
      )}
    </button>
  );
}

function MessageViewer({
  provider,
  messageId,
  onReply,
}: {
  provider: string;
  messageId: string;
  onReply: (cmd: string) => void;
}) {
  const {data, isLoading, error} = useEmailMessage(provider, messageId);
  const msg = data?.email;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-muted animate-spin"/>
      </div>
    );
  }

  if (error || !msg) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted p-6 text-center">
        <AlertCircle className="w-8 h-8 opacity-30"/>
        <p className="text-sm">Could not load message.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-primary space-y-3">
        <h2 className="text-base font-semibold text-primary leading-tight">
          {msg.subject || '(no subject)'}
        </h2>
        <div className="space-y-1 text-xs text-muted">
          <div className="flex gap-2">
            <span className="font-medium text-secondary w-8 shrink-0">From</span>
            <span>{msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email}</span>
          </div>
          {msg.to.length > 0 && (
            <div className="flex gap-2">
              <span className="font-medium text-secondary w-8 shrink-0">To</span>
              <span className="truncate">{msg.to.map(a => a.name || a.email).join(', ')}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="font-medium text-secondary w-8 shrink-0">Date</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3"/>
              {new Date(msg.receivedAt).toLocaleString()}
            </span>
          </div>
        </div>
        {msg.labels && msg.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {msg.labels.map(l => (
              <span key={l} className="px-2 py-0.5 bg-tertiary border border-primary rounded-full text-2xs text-muted">{l}</span>
            ))}
          </div>
        )}
        <button
          onClick={() => onReply(`Reply to the email from ${senderName(msg)} with subject "${msg.subject}"`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-primary rounded-lg text-xs text-muted hover:text-primary hover:bg-hover transition-all focus-ring cursor-pointer"
        >
          <Reply className="w-3.5 h-3.5"/> Reply with AI
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {msg.htmlBody ? (
          <iframe
            srcDoc={msg.htmlBody}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : msg.textBody ? (
          <pre className="text-xs text-primary whitespace-pre-wrap font-sans leading-relaxed">{msg.textBody}</pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted">
            <Mail className="w-6 h-6 opacity-30"/>
            <p className="text-sm">No body content.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageListPane({
  provider,
  box,
  selectedId,
  onSelect,
  unreadOnly,
  searchQuery,
}: {
  provider: string | null;
  box: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  unreadOnly: boolean;
  searchQuery: string | null;
}) {
  const listing = useEmailMessages(searchQuery ? null : provider, {box, limit: 50, unreadOnly});
  const search = useEmailSearch(provider, searchQuery, {box, limit: 50, unreadOnly});
  const result = searchQuery ? search : listing;
  const messages = (result.data?.messages ?? []) as EmailMessage[];
  const countLabel = searchQuery ? `${result.data?.count ?? 0} results` : result.data ? `${result.data.count} messages` : '';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 h-9 border-b border-primary bg-secondary flex items-center justify-between px-3">
        <span className="text-2xs text-muted">{countLabel}</span>
        <button
          onClick={() => result.mutate()}
          className="p-1 text-muted hover:text-primary transition-colors focus-ring rounded cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {result.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-muted animate-spin"/>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-muted p-4 text-center">
            <Inbox className="w-8 h-8 opacity-30"/>
            <p className="text-sm">
              {searchQuery ? `No emails found for "${searchQuery}"` : unreadOnly ? `No unread messages in ${box}` : `${box} is empty`}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageListItem
              key={msg.id}
              msg={msg}
              selected={msg.id === selectedId}
              onClick={() => onSelect(msg.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmailBrowserPane({
  provider,
  availableProviders,
  providersLoading,
  selectedMessageId,
  onSelectMessage,
  onProviderChange,
  onSendToAgent,
}: {
  provider: string | null;
  availableProviders: string[];
  providersLoading: boolean;
  selectedMessageId: string | null;
  onSelectMessage: (id: string | null) => void;
  onProviderChange: (p: string) => void | Promise<void>;
  onSendToAgent: (message: string) => void | Promise<void>;
}) {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const {data: boxesData, isLoading: boxesLoading} = useEmailBoxes(provider);
  const boxes = boxesData?.boxes ?? [];

  useEffect(() => {
    setActiveSearch(null);
    setSearchInput('');
    onSelectMessage(null);
  }, [provider, onSelectMessage]);

  useEffect(() => {
    if (boxes.length === 0) return;
    if (boxes.some(box => box.id === selectedFolder)) return;
    setSelectedFolder(boxes.find(box => box.id === 'inbox')?.id ?? boxes[0].id);
  }, [boxes, selectedFolder]);

  const currentFolder = boxes.find(box => box.id === selectedFolder) ?? {id: selectedFolder, name: selectedFolder};
  const {icon: FolderIcon, color: folderColor, label: folderLabel} = getBoxPresentation(currentFolder);

  const handleFolderSelect = (id: string) => {
    setSelectedFolder(id);
    setActiveSearch(null);
    onSelectMessage(null);
  };

  const handleSearch = (e: {preventDefault(): void}) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim() || null);
    onSelectMessage(null);
  };

  if (!providersLoading && availableProviders.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <WifiOff className="w-10 h-10 text-muted opacity-30"/>
        <div>
          <h2 className="text-base font-semibold text-primary mb-1">No email providers configured</h2>
          <p className="text-sm text-muted max-w-xs">Add an email provider to browse your inbox here.</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="w-6 h-6 text-muted animate-spin"/>
        <p className="text-sm text-muted">Loading email providers…</p>
      </div>
    );
  }

  if (!boxesLoading && boxes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Mail className="w-10 h-10 text-muted opacity-30"/>
        <div>
          <h2 className="text-base font-semibold text-primary mb-1">No email boxes available</h2>
          <p className="text-sm text-muted max-w-xs">The selected provider did not expose any readable email boxes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 h-10 border-b border-primary bg-secondary flex items-center gap-2 px-3">
        <FolderIcon className={cn('w-4 h-4 shrink-0', folderColor)} />
        <span className="text-sm font-medium text-primary">{folderLabel}</span>
        <div className="flex-1"/>
        <button
          onClick={() => setUnreadOnly(v => !v)}
          className={cn(
            'text-2xs px-2 py-1 rounded-md border transition-all focus-ring cursor-pointer',
            unreadOnly ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-secondary border-primary text-muted hover:text-primary',
          )}
        >
          Unread
        </button>
        <ProviderSelector
          provider={provider}
          availableProviders={availableProviders}
          loading={providersLoading}
          onProviderChange={onProviderChange}
        />
      </div>

      <form onSubmit={handleSearch} className="shrink-0 px-3 py-2 border-b border-primary bg-secondary flex gap-2">
        <input
          type="text"
          placeholder="Search emails…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 bg-input border border-primary rounded-lg py-1 px-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
        />
        {activeSearch && (
          <button
            type="button"
            onClick={() => {
              setActiveSearch(null);
              setSearchInput('');
            }}
            className="px-2 text-2xs text-muted hover:text-primary transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          className="p-1.5 text-muted hover:text-primary transition-colors focus-ring rounded-md cursor-pointer"
          title="Search"
        >
          <Search className="w-3.5 h-3.5"/>
        </button>
      </form>

      <div className="flex flex-1 min-h-0">
        <FolderSidebar boxes={boxes} selected={selectedFolder} onSelect={handleFolderSelect} />

        <div className="w-64 shrink-0 border-r border-primary flex flex-col min-h-0 bg-primary">
          <MessageListPane
            provider={provider}
            box={selectedFolder}
            selectedId={selectedMessageId}
            onSelect={id => onSelectMessage(id)}
            unreadOnly={unreadOnly}
            searchQuery={activeSearch}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-hidden bg-primary">
          {selectedMessageId ? (
            <MessageViewer
              provider={provider}
              messageId={selectedMessageId}
              onReply={onSendToAgent}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center text-muted">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Mail className="w-7 h-7 text-white"/>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">No message selected</p>
                <p className="text-xs mt-1 max-w-xs">Select a message from the list, or start the email agent below when you want drafting and AI actions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailAgentPane({
  agentId,
  startingAgent,
  agentError,
  onStart,
}: {
  agentId: string | null;
  startingAgent: boolean;
  agentError: string | null;
  onStart: () => Promise<void>;
}) {
  if (agentId) {
    return <ChatPage agentId={agentId} />;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      {startingAgent ? (
        <>
          <Loader2 className="w-6 h-6 text-muted animate-spin"/>
          <div>
            <h2 className="text-sm font-semibold text-primary mb-1">Starting email agent…</h2>
            <p className="text-xs text-muted max-w-xs">The inbox is already available above. This agent is only for drafting, replies, and AI-assisted workflows.</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/15 to-rose-600/15 flex items-center justify-center">
            <Mail className="w-6 h-6 text-red-500"/>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary mb-1">Email agent is idle</h2>
            <p className="text-xs text-muted max-w-xs">Browse your inbox without an agent. Start one when you want to compose a draft or work through email with AI.</p>
          </div>
          <button
            onClick={() => void onStart()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors focus-ring cursor-pointer shadow-button-primary"
          >
            <FileText className="w-3.5 h-3.5"/> Compose With AI
          </button>
        </>
      )}

      {agentError && !startingAgent && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5"/>
          {agentError}
        </div>
      )}
    </div>
  );
}

export default function EmailApp() {
  const providers = useEmailProviders();
  const [provider, setProvider] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [startingAgent, setStartingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const ownedAgentRef = useRef<string | null>(null);
  const agentStartPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    const availableProviders = providers.data?.providers ?? [];
    if (!availableProviders.length) return;
    if (!provider || !availableProviders.includes(provider)) {
      setProvider(availableProviders[0]);
      setSelectedMessageId(null);
    }
  }, [providers.data, provider]);

  useEffect(() => {
    return () => {
      if (ownedAgentRef.current) {
        agentRPCClient.deleteAgent({agentId: ownedAgentRef.current, reason: 'Email app unmounted'}).catch(() => {});
        ownedAgentRef.current = null;
      }
    };
  }, []);

  const ensureAgent = useCallback(async () => {
    if (agentId) return agentId;
    if (agentStartPromiseRef.current) return agentStartPromiseRef.current;

    setStartingAgent(true);
    setAgentError(null);

    const startPromise = (async () => {
      try {
        const {id} = await agentRPCClient.createAgent({agentType: 'email', headless: false});
        ownedAgentRef.current = id;
        setAgentId(id);

        if (provider || selectedMessageId) {
          await emailRPCClient.updateEmailState({
            agentId: id,
            selectedProvider: provider ?? undefined,
            selectedMessageId: selectedMessageId ?? undefined,
          });
        }

        return id;
      } catch (error: any) {
        setAgentError(error.message || 'Failed to start email agent');
        return null;
      } finally {
        setStartingAgent(false);
        agentStartPromiseRef.current = null;
      }
    })();

    agentStartPromiseRef.current = startPromise;
    return startPromise;
  }, [agentId, provider, selectedMessageId]);

  useEffect(() => {
    if (!agentId || (!provider && !selectedMessageId)) return;
    emailRPCClient.updateEmailState({
      agentId,
      selectedProvider: provider ?? undefined,
      selectedMessageId: selectedMessageId ?? undefined,
    }).catch(() => {});
  }, [agentId, provider, selectedMessageId]);

  const handleSendToAgent = useCallback(async (message: string) => {
    const id = await ensureAgent();
    if (!id) return;
    await agentRPCClient.sendInput({agentId: id, input: {from: 'Email App', message}});
  }, [ensureAgent]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-primary">
      <div className="shrink-0 border-b border-primary bg-secondary px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-primary">Email</h1>
          <p className="text-2xs text-muted">Read, compose, and manage emails with AI</p>
        </div>
        <button
          onClick={() => void ensureAgent()}
          disabled={startingAgent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 focus-ring shadow-button-primary"
        >
          {startingAgent ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>}
          Compose With AI
        </button>
      </div>

      <ResizableSplit
        direction="vertical"
        initialRatio={0.6}
        minFirst={200}
        minSecond={160}
        className="flex-1 min-h-0"
      >
        <EmailBrowserPane
          provider={provider}
          availableProviders={providers.data?.providers ?? []}
          providersLoading={providers.isLoading}
          selectedMessageId={selectedMessageId}
          onSelectMessage={setSelectedMessageId}
          onProviderChange={async p => {
            setProvider(p);
            setSelectedMessageId(null);
          }}
          onSendToAgent={handleSendToAgent}
        />
        <EmailAgentPane
          agentId={agentId}
          startingAgent={startingAgent}
          agentError={agentError}
          onStart={async () => {
            await ensureAgent();
          }}
        />
      </ResizableSplit>
    </div>
  );
}
