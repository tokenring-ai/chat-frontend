import {
  Check,
  ChevronRight,
  Code,
  Download,
  Eye,
  EyeOff,
  File,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  User,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import CodeEditor from '../../components/editor/CodeEditor.tsx';
import MarkdownEditor from '../../components/editor/MarkdownEditor.tsx';
import ResizableSplit from '../../components/ui/ResizableSplit.tsx';
import {toastManager} from '../../components/ui/toast.tsx';
import {cn} from '../../lib/utils.ts';
import {
  agentRPCClient,
  filesystemRPCClient,
  useAgentTypes,
  useDirectoryListing,
  useFileContents,
  useFilesystemProviders,

} from '../../rpc.ts';

// ─── helpers ────────────────────────────────────────────────────────────────

const getBasename = (p: string) => {
  const clean = p.endsWith('/') ? p.slice(0, -1) : p;
  return clean.split('/').pop() || p;
};

function getFileIcon(file: string, isDir: boolean, size = 16) {
  if (isDir) return <Folder className="text-indigo-400 shrink-0" size={size} />;
  if (/\.(tsx?|jsx?)$/.test(file)) return <FileText className="text-cyan-500 shrink-0" size={size} />;
  if (file.endsWith('.json')) return <Code className="text-amber-500 shrink-0" size={size} />;
  if (file.endsWith('.md')) return <FileText className="text-purple-400 shrink-0" size={size} />;
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(file)) return <ImageIcon className="text-pink-400 shrink-0" size={size} />;
  return <FileText className="text-muted shrink-0" size={size} />;
}

// ─── useInitAgent ─────────────────────────────────────────────────────────

function useInitAgent() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);
  const agentRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const types = await agentRPCClient.getAgentTypes({});
        if (cancelled) return;
        const preferred = types.find(t => t.type === 'coder') ?? types[0];
        if (!preferred) { setError('No agent types available'); setInitialising(false); return; }
        const { id } = await agentRPCClient.createAgent({ agentType: preferred.type, headless: true });
        if (cancelled) { agentRPCClient.deleteAgent({ agentId: id, reason: 'Files app cancelled during init' }).catch(() => {}); return; }
        agentRef.current = id;
        setAgentId(id);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to initialise file browser');
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();
    return () => {
      cancelled = true;
      if (agentRef.current) {
        agentRPCClient.deleteAgent({ agentId: agentRef.current, reason: 'Files app unmounted' }).catch(() => {});
        agentRef.current = null;
      }
    };
  }, []);

  return { agentId, initialising, error };
}

// ─── AgentLaunchPanel ────────────────────────────────────────────────────────

interface AgentLaunchPanelProps {
  selectedPaths: Set<string>;
  onClear: () => void;
}

function AgentLaunchPanel({ selectedPaths, onClear }: AgentLaunchPanelProps) {
  const navigate = useNavigate();
  const agentTypes = useAgentTypes();
  const [chosenType, setChosenType] = useState('');
  const [launching, setLaunching] = useState(false);

  // Default to first available type
  useEffect(() => {
    if (!chosenType && agentTypes.data?.length) {
      setChosenType(agentTypes.data[0].type);
    }
  }, [agentTypes.data, chosenType]);

  const launch = async () => {
    if (!chosenType) return;
    setLaunching(true);
    try {
      const { id: newAgentId } = await agentRPCClient.createAgent({ agentType: chosenType, headless: false });
      // Add each selected file to the new agent
      await Promise.all(
        Array.from(selectedPaths).map(file =>
          filesystemRPCClient.addFileToChat({ agentId: newAgentId, file })
        )
      );
      void navigate(`/agent/${newAgentId}`);
    } catch (e: any) {
      toastManager.error(e.message || 'Failed to launch agent', { duration: 5000 });
    } finally {
      setLaunching(false);
    }
  };

  const count = selectedPaths.size;

  return (
    <div className="shrink-0 border-t border-primary bg-secondary px-4 py-3 flex items-center gap-3">
      {/* Count badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white text-2xs font-bold">{count}</span>
        </div>
        <span className="text-sm font-medium text-primary">{count === 1 ? '1 file selected' : `${count} files selected`}</span>
      </div>

      <div className="flex-1" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted hover:text-primary text-xs transition-colors focus-ring rounded-md hover:bg-hover cursor-pointer"
        aria-label="Clear selection"
      >
        <X className="w-3.5 h-3.5" /> Clear
      </button>

      {/* Agent type selector */}
      <select
        value={chosenType}
        onChange={e => setChosenType(e.target.value)}
        className="bg-input border border-primary rounded-lg px-2 py-1.5 text-xs text-primary focus-ring cursor-pointer"
        aria-label="Agent type to launch"
      >
        {(agentTypes.data ?? []).map(t => (
          <option key={t.type} value={t.type}>{t.displayName}</option>
        ))}
      </select>

      {/* Launch */}
      <button
        onClick={launch}
        disabled={launching || !chosenType}
        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors focus-ring shadow-button-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Launch agent with selected files"
      >
        {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
        Launch Agent
      </button>
    </div>
  );
}

// ─── BreadcrumbBar ───────────────────────────────────────────────────────────

interface BreadcrumbBarProps {
  path: string;
  onNavigate: (p: string) => void;
  showHidden: boolean;
  onToggleHidden: () => void;
  onUpload: () => void;
  onRefresh: () => void;
}

function BreadcrumbBar({ path, onNavigate, showHidden, onToggleHidden, onUpload, onRefresh }: BreadcrumbBarProps) {
  const parts = path === '.' ? [] : path.split('/');
  return (
    <div className="h-10 border-b border-primary bg-secondary flex items-center gap-2 px-3 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-0.5 text-xs text-muted flex-1 min-w-0 overflow-hidden">
        <button onClick={() => onNavigate('.')} className="hover:text-primary shrink-0 focus-ring rounded px-1 cursor-pointer">root</button>
        {parts.map((part, i) => (
          <React.Fragment key={part}>
            <ChevronRight className="w-3 h-3 shrink-0 text-dim" />
            <button
              onClick={() => onNavigate(parts.slice(0, i + 1).join('/'))}
              className={cn('hover:text-primary truncate focus-ring rounded px-1 cursor-pointer', i === parts.length - 1 && 'text-primary font-medium')}
            >{part}</button>
          </React.Fragment>
        ))}
      </div>

      {/* Controls */}
      <button onClick={onRefresh} className="p-1.5 text-muted hover:text-primary transition-colors focus-ring rounded-md cursor-pointer" aria-label="Refresh" title="Refresh">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleHidden}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-hover text-muted text-2xs transition-colors focus-ring cursor-pointer"
        title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
      >
        {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{showHidden ? 'Hide' : 'Show'} hidden</span>
      </button>
      <button
        onClick={onUpload}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-hover text-muted text-2xs transition-colors focus-ring cursor-pointer"
        title="Upload files"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Upload</span>
      </button>
    </div>
  );
}

// ─── FileListPane ────────────────────────────────────────────────────────────

interface FileListPaneProps {
  provider: string | null;
  path: string;
  onNavigate: (p: string) => void;
  onSelectFile: (f: string) => void;
  selectedFile: string | null;
  selectedPaths: Set<string>;
  onToggleSelected: (f: string) => void;
  onToggleSelectAll: (files: string[]) => void;
  uploadingFiles: string[];
  searchQuery: string;
  onRefresh: () => void;
}

function FileListPane({
  provider, path, onNavigate, onSelectFile, selectedFile,
  selectedPaths, onToggleSelected, onToggleSelectAll, uploadingFiles, searchQuery,
}: FileListPaneProps) {
  const listing = useDirectoryListing(provider ? { path, showHidden: false, provider } : undefined);

  // Expose mutate upward via onRefresh
  useEffect(() => { /* no-op: refresh is triggered externally */ }, []);

  const sortedFiles = useMemo(() => {
    if (!listing.data?.files) return [];
    let files = [...listing.data.files];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      files = files.filter(f => getBasename(f).toLowerCase().includes(q));
    }
    return files.sort((a, b) => {
      const dA = a.endsWith('/'), dB = b.endsWith('/');
      if (dA && !dB) return -1;
      if (!dA && dB) return 1;
      return a.localeCompare(b);
    });
  }, [listing.data?.files, searchQuery]);

  // allSelected = all non-dir files are selected
  const fileOnly = sortedFiles.filter(f => !f.endsWith('/'));
  const allSelected = fileOnly.length > 0 && fileOnly.every(f => selectedPaths.has(f));

  const handleRowClick = (file: string) => {
    const isDir = file.endsWith('/');
    if (isDir) {
      const dirPath = file.endsWith('/') ? file.slice(0, -1) : file;
      onNavigate(dirPath);
      return;
    }
    onSelectFile(file);
  };

  if (listing.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 text-muted animate-spin" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-secondary z-10">
          <tr className="text-2xs text-muted font-semibold border-b border-primary">
            <th className="pl-3 pr-2 py-2 w-8">
              <button
                onClick={() => onToggleSelectAll(fileOnly)}
                className={cn(
                  'w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-all focus-ring cursor-pointer',
                  allSelected ? 'border-indigo-500 bg-indigo-500' : 'border-primary hover:border-muted'
                )}
                aria-label={allSelected ? 'Deselect all' : 'Select all files'}
                title={allSelected ? 'Deselect all' : 'Select all files'}
              >
                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
            </th>
            <th className="px-2 py-2 font-medium">Name</th>
            <th className="px-2 py-2 font-medium w-24 hidden md:table-cell">Type</th>
            <th className="px-2 py-2 font-medium w-16 hidden sm:table-cell text-right pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {sortedFiles.map((file) => {
            const isDir = file.endsWith('/');
            const name = getBasename(file);
            const isSelectedFile = selectedFile === file;
            const isChecked = selectedPaths.has(file);
            const isUploading = uploadingFiles.includes(name);

            return (
              <tr
                key={file}
                onClick={() => handleRowClick(file)}
                className={cn(
                  'group border-b border-primary cursor-pointer transition-colors outline-none',
                  isSelectedFile ? 'bg-active' : 'hover:bg-hover',
                )}
                tabIndex={0}
                role="row"
                aria-label={`${isDir ? 'Directory' : 'File'}: ${name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(file); } }}
              >
                {/* Checkbox */}
                <td className="pl-3 pr-2 py-2.5" onClick={e => e.stopPropagation()}>
                  {!isDir && (
                    <button
                      onClick={() => onToggleSelected(file)}
                      className={cn(
                        'w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-all focus-ring cursor-pointer',
                        isChecked ? 'border-indigo-500 bg-indigo-500' : 'border-primary hover:border-indigo-400'
                      )}
                      aria-label={isChecked ? `Deselect ${name}` : `Select ${name}`}
                      aria-checked={isChecked}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  )}
                </td>

                {/* Name */}
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file, isDir)}
                    <span className={cn('font-medium truncate', isSelectedFile ? 'text-indigo-400' : 'text-primary', isUploading && 'text-indigo-400')}>
                      {name}
                    </span>
                    {isUploading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </div>
                </td>

                {/* Type */}
                <td className="px-2 py-2.5 text-muted hidden md:table-cell">
                  {isDir ? 'folder' : (name.includes('.') ? name.split('.').pop() : '—')}
                </td>

                {/* Actions */}
                <td className="px-2 py-2.5 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    {!isDir && (
                      <button
                        onClick={async () => {
                          try {
                            const result = await filesystemRPCClient.readTextFile({ path: file, provider: provider! });
                            const blob = new Blob([result.content ?? ''], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = name; a.click();
                            URL.revokeObjectURL(url);
                          } catch { toastManager.error('Download failed', { duration: 3000 }); }
                        }}
                        className="p-1 hover:text-primary text-muted focus-ring rounded cursor-pointer"
                        aria-label={`Download ${name}`}
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {sortedFiles.length === 0 && (
            <tr>
              <td colSpan={4} className="py-16 text-center text-muted text-sm">
                {searchQuery ? `No files matching "${searchQuery}"` : 'This directory is empty.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PreviewMetadataPaneProps {
  agentId: string;
  file: string | null;
  provider: string | null;
  selectedPaths: Set<string>;
  onToggleSelected: (f: string) => void;
  onClose: () => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
}

function PreviewMetadataPane({
  file,
  provider,
  selectedPaths,
  onToggleSelected,
  onClose,
  isDirty,
  saving,
  onSave,
}: PreviewMetadataPaneProps) {
  const navigate = useNavigate();
  if (!file) {
    return (
      <div className="h-full bg-tertiary flex flex-col items-center justify-center text-center p-8">
        <File className="w-12 h-12 text-muted opacity-20 mb-4" />
        <p className="text-sm text-muted">Select a file to preview</p>
        <p className="text-2xs text-dim mt-1">Or check files and launch an agent</p>
      </div>
    );
  }

  const name = getBasename(file);
  const isChecked = selectedPaths.has(file);

  return (
    <div className="h-full bg-secondary flex flex-col">
      {/* File header */}
      <div className="px-4 py-3 border-b border-primary flex items-start gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-tertiary flex items-center justify-center shrink-0">
          {getFileIcon(file, false, 20)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate" title={file}>{name}</p>
          <p className="text-2xs text-muted mt-0.5">{file.split('.').pop()?.toUpperCase() || 'File'}</p>
        </div>
        <button onClick={onClose} className="p-1 text-muted hover:text-primary focus-ring rounded cursor-pointer" aria-label="Close preview">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-b border-primary space-y-2 shrink-0">
        <button
          onClick={() => onToggleSelected(file)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all focus-ring cursor-pointer',
            isChecked
              ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-button-primary'
          )}
        >
          {isChecked ? <><Check className="w-3.5 h-3.5" /> Selected for launch</> : <><Plus className="w-3.5 h-3.5" /> Select for launch</>}
        </button>
        {/\.md$/i.test(file) && provider && (
          <button
            onClick={async () => {
              try {
                const result = await filesystemRPCClient.readTextFile({path: file, provider});
                const title = getBasename(file).replace(/\.md$/i, '');
                void navigate('/documents', {state: {filePath: file, fileContent: result.content ?? '', title, provider}});
              } catch { toastManager.error('Could not read file', {duration: 3000}); }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary text-xs font-medium text-muted hover:text-primary hover:bg-hover transition-all focus-ring cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Open in Documents
          </button>
        )}
        {/\.html?$/i.test(file) && provider && (
          <button
            onClick={async () => {
              try {
                const result = await filesystemRPCClient.readTextFile({path: file, provider});
                void navigate('/canvas', {state: {filePath: file, fileContent: result.content ?? '', provider}});
              } catch { toastManager.error('Could not read file', {duration: 3000}); }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary text-xs font-medium text-muted hover:text-primary hover:bg-hover transition-all focus-ring cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" /> Open in Canvas
          </button>
        )}
        {isDirty && (
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary text-xs font-medium text-muted hover:text-primary hover:bg-hover transition-all focus-ring cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="px-4 py-2 border-b border-primary space-y-1 shrink-0">
        <div className="flex justify-between text-2xs">
          <span className="text-muted">Path</span>
          <span className="text-primary truncate ml-4 max-w-40" title={file}>{file}</span>
        </div>
      </div>
    </div>
  );
}

// ─── FileEditorPane ──────────────────────────────────────────────────────────

interface FileEditorPaneProps {
  file: string | null;
  content: string;
  onContentChange: (c: string) => void;
  isLoading: boolean;
  hasData: boolean;
}

function FileEditorPane({ file, content, onContentChange, isLoading, hasData }: FileEditorPaneProps) {
  if (!file) {
    return (
      <div className="h-full bg-tertiary flex flex-col items-center justify-center text-center p-8">
        <Code className="w-12 h-12 text-muted opacity-20 mb-4" />
        <p className="text-sm text-muted">No file selected for editing</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-secondary flex flex-col">
      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-4 h-4 text-muted animate-spin" /></div>
        ) : hasData ? (
          <div className="h-full overflow-auto">
            {file.endsWith('.md') ? (
              <MarkdownEditor key={file} content={content} onContentChange={onContentChange} />
            ) : (
              <CodeEditor key={file} file={file} content={content} onContentChange={onContentChange} />
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-2xs text-muted">Could not load file</div>
        )}
      </div>
    </div>
  );
}

// ─── FilesApp ─────────────────────────────────────────────────────────────────

export default function FilesApp() {
  const { agentId, initialising, error } = useInitAgent();
  const fsProviders = useFilesystemProviders();
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!provider && fsProviders.data?.providers.length) {
      setProvider(fsProviders.data.providers[0]);
    }
  }, [fsProviders.data, provider]);

  const [path, setPath] = useState('.');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listing = useDirectoryListing(agentId && provider ? { path, showHidden, provider } : undefined);

  const [saving, setSaving] = useState(false);
  const fileContent = useFileContents(selectedFile, provider);

  const [updatedContent, setUpdatedContent] = useState<string|null>(null);

  const editorContent = updatedContent ?? fileContent.data?.content ?? '';

  const handleSave = async () => {
    if (!selectedFile || !agentId || !provider) return;
    setSaving(true);
    try {
      await filesystemRPCClient.writeFile({ path: selectedFile, content: editorContent, provider });
      await fileContent.mutate(() => ({ content: editorContent}));
      setUpdatedContent(null);

      toastManager.success('Saved', { duration: 2000 });
    } catch {
      toastManager.error('Save failed', { duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = editorContent !== (fileContent.data?.content ?? '');

  const toggleSelected = useCallback((file: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file); else next.add(file);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((files: string[]) => {
    setSelectedPaths(prev => {
      const allIn = files.every(f => prev.has(f));
      const next = new Set(prev);
      if (allIn) { files.forEach(f => { next.delete(f); }); }
      else { files.forEach(f => { next.add(f); }); }
      return next;
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!agentId || !provider) return;
    const files = e.target.files;
    if (!files?.length) return;
    const MAX = 5 * 1024 * 1024;
    const names = Array.from(files).map(f => f.name);
    setUploadingFiles(names);
    for (const file of Array.from(files)) {
      if (file.size > MAX) { toastManager.error(`"${file.name}" exceeds 5 MB limit`, { duration: 3000 }); continue; }
      try {
        const content = await file.text();
        const dest = path === '.' ? file.name : `${path}/${file.name}`;
        await filesystemRPCClient.writeFile({ path: dest, content, provider });
      } catch { toastManager.error(`Failed to upload "${file.name}"`, { duration: 3000 }); }
    }
    setUploadingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await listing.mutate();
  };

  // ── Loading / error states ───────────────────────────────────────────────

  if (initialising) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
          <span className="text-sm text-muted">Starting file browser…</span>
        </div>
      </div>
    );
  }

  if (error || !agentId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <FolderOpen className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary mb-1">File Browser Unavailable</h2>
          <p className="text-xs text-muted max-w-sm">{error ?? 'Unknown error'}</p>
        </div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors focus-ring cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-hidden">

      {/* App header */}
      <div className="shrink-0 border-b border-primary bg-secondary px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
          <FolderOpen className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-primary">Files</h1>
          <p className="text-2xs text-muted">Browse files · select · launch agent</p>
        </div>
        {/* Provider selector */}
        {(fsProviders.data?.providers.length ?? 0) > 1 && (
          <select
            value={provider ?? ''}
            onChange={e => { setProvider(e.target.value); setPath('.'); setSelectedFile(null); }}
            className="bg-input border border-primary rounded-lg px-2 py-1.5 text-xs text-primary focus-ring cursor-pointer"
            aria-label="Filesystem provider"
          >
            {fsProviders.data!.providers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-input border border-primary rounded-lg py-1.5 pl-8 pr-7 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-44 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary focus-ring rounded p-0.5 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs + toolbar */}
      <BreadcrumbBar
        path={path}
        onNavigate={p => { setPath(p); setSelectedFile(null); }}
        showHidden={showHidden}
        onToggleHidden={() => setShowHidden(v => !v)}
        onUpload={() => fileInputRef.current?.click()}
        onRefresh={() => listing.mutate()}
      />
      <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />

      {/* Body: file list above editor */}
      <ResizableSplit
        direction="vertical"
        initialRatio={0.5}
        minFirst={180}
        minSecond={150}
        className="flex-1 min-h-0"
      >
        <ResizableSplit
          direction="horizontal"
          initialRatio={0.66}
          minFirst={220}
          minSecond={180}
          className="h-full"
        >
          <FileListPane
            provider={provider}
            path={path}
            onNavigate={p => { setPath(p); setSelectedFile(null); }}
            onSelectFile={setSelectedFile}
            selectedFile={selectedFile}
            selectedPaths={selectedPaths}
            onToggleSelected={toggleSelected}
            onToggleSelectAll={toggleSelectAll}
            uploadingFiles={uploadingFiles}
            searchQuery={searchQuery}
            onRefresh={() => listing.mutate()}
          />
          <PreviewMetadataPane
            agentId={agentId}
            file={selectedFile}
            provider={provider}
            selectedPaths={selectedPaths}
            onToggleSelected={toggleSelected}
            onClose={() => setSelectedFile(null)}
            isDirty={isDirty}
            saving={saving}
            onSave={handleSave}
          />
        </ResizableSplit>
        <FileEditorPane
          file={selectedFile}
          content={editorContent}
          onContentChange={setUpdatedContent}
          isLoading={fileContent.isLoading}
          hasData={!!fileContent.data}
        />
      </ResizableSplit>

      {/* Selection action bar */}
      {selectedPaths.size > 0 && (
        <AgentLaunchPanel
          selectedPaths={selectedPaths}
          onClear={() => setSelectedPaths(new Set())}
        />
      )}
    </div>
  );
}
