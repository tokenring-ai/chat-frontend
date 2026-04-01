import {
  AlertCircle,
  Archive,
  FileText,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import ResizableSplit from '../../components/ui/ResizableSplit.tsx';
import {cn} from '../../lib/utils.ts';
import ChatPage from '../ChatPage.tsx';
import {agentRPCClient} from '../../rpc.ts';

// ── useInitEmailAgent ─────────────────────────────────────────────────────────

function useInitEmailAgent() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);
  const agentRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {id} = await agentRPCClient.createAgent({agentType: 'email', headless: false});
        if (cancelled) {
          agentRPCClient.deleteAgent({agentId: id, reason: 'Email app cancelled during init'}).catch(() => {});
          return;
        }
        agentRef.current = id;
        setAgentId(id);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to start email agent');
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();
    return () => {
      cancelled = true;
      if (agentRef.current) {
        agentRPCClient.deleteAgent({agentId: agentRef.current, reason: 'Email app unmounted'}).catch(() => {});
        agentRef.current = null;
      }
    };
  }, []);

  return {agentId, initialising, error};
}

// ── Folders ───────────────────────────────────────────────────────────────────

const FOLDERS = [
  {id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-blue-400'},
  {id: 'starred', label: 'Starred', icon: Star, color: 'text-amber-400'},
  {id: 'sent', label: 'Sent', icon: Send, color: 'text-green-400'},
  {id: 'drafts', label: 'Drafts', icon: FileText, color: 'text-purple-400'},
  {id: 'archive', label: 'Archive', icon: Archive, color: 'text-muted'},
  {id: 'trash', label: 'Trash', icon: Trash2, color: 'text-red-400'},
] as const;

type FolderId = (typeof FOLDERS)[number]['id'];

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {label: 'Check inbox', cmd: 'Check my inbox and list unread emails'},
  {label: 'Compose', cmd: 'Help me compose a new email'},
  {label: 'Search', cmd: 'Search my emails'},
  {label: 'Unread count', cmd: 'How many unread emails do I have?'},
];

// ── FolderSidebar ─────────────────────────────────────────────────────────────

interface FolderSidebarProps {
  selected: FolderId;
  onSelect: (id: FolderId) => void;
}

function FolderSidebar({selected, onSelect}: FolderSidebarProps) {
  return (
    <div className="w-44 shrink-0 border-r border-primary bg-secondary flex flex-col py-3">
      <p className="text-2xs font-bold text-muted uppercase tracking-widest px-4 pb-2">Folders</p>
      <nav className="space-y-0.5 px-2">
        {FOLDERS.map(({id, label, icon: Icon, color}) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors focus-ring cursor-pointer text-left',
              selected === id
                ? 'bg-active text-primary'
                : 'hover:bg-hover text-muted hover:text-primary',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', selected === id ? color : 'text-muted')} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── EmailBrowserPane ──────────────────────────────────────────────────────────

interface EmailBrowserPaneProps {
  agentId: string;
}

function EmailBrowserPane({agentId}: EmailBrowserPaneProps) {
  const [selectedFolder, setSelectedFolder] = useState<FolderId>('inbox');
  const [sending, setSending] = useState(false);

  const sendToAgent = async (message: string) => {
    if (sending) return;
    setSending(true);
    try {
      await agentRPCClient.sendInput({
        agentId,
        input: {from: 'Email App', message},
      });
    } catch {
      // agent may be busy — user will see status in chat pane below
    } finally {
      setSending(false);
    }
  };

  const handleFolderSelect = (id: FolderId) => {
    setSelectedFolder(id);
    const folder = FOLDERS.find(f => f.id === id);
    if (folder) {
      sendToAgent(`Open ${folder.label.toLowerCase()} folder and show me the emails`);
    }
  };

  const currentFolder = FOLDERS.find(f => f.id === selectedFolder)!;
  const FolderIcon = currentFolder.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Email toolbar */}
      <div className="shrink-0 h-10 border-b border-primary bg-secondary flex items-center gap-2 px-3">
        <FolderIcon className={cn('w-4 h-4 shrink-0', currentFolder.color)} />
        <span className="text-sm font-medium text-primary">{currentFolder.label}</span>
        <div className="flex-1" />
        <button
          onClick={() => sendToAgent(`Refresh and show latest emails in ${currentFolder.label.toLowerCase()}`)}
          disabled={sending}
          className="p-1.5 text-muted hover:text-primary transition-colors focus-ring rounded-md cursor-pointer disabled:opacity-50"
          title="Refresh"
          aria-label="Refresh folder"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', sending && 'animate-spin')} />
        </button>
      </div>

      {/* Body: folder sidebar + content area */}
      <div className="flex flex-1 min-h-0">
        <FolderSidebar selected={selectedFolder} onSelect={handleFolderSelect} />

        {/* Main content — prompt/quick actions */}
        <div className="flex-1 overflow-y-auto bg-primary flex flex-col items-center justify-center p-8 gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-primary">AI-Powered Email</h3>
            <p className="text-sm text-muted max-w-xs leading-relaxed">
              Use the chat below to read, compose, search, and manage your emails with natural language.
            </p>
          </div>

          {/* Quick actions */}
          <div className="space-y-2 w-full max-w-xs">
            <p className="text-2xs font-bold text-muted uppercase tracking-widest">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({label, cmd}) => (
                <button
                  key={label}
                  onClick={() => sendToAgent(cmd)}
                  disabled={sending}
                  className="px-3 py-2.5 bg-secondary hover:bg-hover border border-primary rounded-xl text-xs font-medium text-muted hover:text-primary transition-all focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Folder shortcut chips */}
          <div className="space-y-2 w-full max-w-xs">
            <p className="text-2xs font-bold text-muted uppercase tracking-widest">Browse</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {FOLDERS.map(({id, label, icon: Icon, color}) => (
                <button
                  key={id}
                  onClick={() => handleFolderSelect(id)}
                  disabled={sending}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-2xs font-medium transition-all focus-ring cursor-pointer disabled:opacity-50',
                    selectedFolder === id
                      ? 'bg-active border-active text-primary'
                      : 'bg-secondary border-primary text-muted hover:text-primary hover:bg-hover',
                  )}
                >
                  <Icon className={cn('w-3 h-3', selectedFolder === id ? color : 'text-muted')} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EmailApp ──────────────────────────────────────────────────────────────────

export default function EmailApp() {
  const {agentId, initialising, error} = useInitEmailAgent();

  if (initialising) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
          <span className="text-sm text-muted">Starting email agent…</span>
        </div>
      </div>
    );
  }

  if (error || !agentId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary mb-1">Email Unavailable</h2>
          <p className="text-xs text-muted max-w-sm">{error ?? 'Email agent could not be started'}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors focus-ring cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-primary">
      {/* App header */}
      <div className="shrink-0 border-b border-primary bg-secondary px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-primary">Email</h1>
          <p className="text-2xs text-muted">Read, compose, and manage emails with AI</p>
        </div>
      </div>

      {/* Resizable split: email browser (top) + chat (bottom) */}
      <ResizableSplit
        direction="vertical"
        initialRatio={0.55}
        minFirst={200}
        minSecond={160}
        className="flex-1 min-h-0"
      >
        <EmailBrowserPane agentId={agentId} />
        <ChatPage agentId={agentId} />
      </ResizableSplit>
    </div>
  );
}
