import {Bot, Check, ChevronRight, Eye, FileText, Loader2, Save, Sparkles, X} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useLocation} from 'react-router-dom';
import {toastManager} from '../../components/ui/toast.tsx';
import {cn} from '../../lib/utils.ts';
import {agentRPCClient, filesystemRPCClient, useFilesystemProviders} from '../../rpc.ts';

// ─── Initial content ──────────────────────────────────────────────────────────

const INITIAL_CONTENT = `# Welcome to Documents

Start writing your markdown document here. Select any text and use the **AI Edit** panel to get AI-powered editing assistance.

## Features

- **Rich Markdown Editing** — Full markdown syntax support with live preview
- **Live Preview** — See your document rendered in real time
- **AI-Powered Editing** — Select any text, describe what you want, and apply changes instantly

## Getting Started

1. Edit this document or clear it to start fresh
2. **Select any text** in the editor to activate AI editing
3. Switch to the **AI Edit** panel and type your instruction
4. Click **Ask AI**, then **Apply Changes** to update your document

> **Tip:** Use Ctrl/⌘+Enter in the AI prompt to submit quickly.
`;

// ─── useInitAgent ─────────────────────────────────────────────────────────────

function useInitAgent() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);
  const agentRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const types = await agentRPCClient.getAgentTypes({});
        if (cancelled) return;
        const preferred = types.find(t => t.type === 'writer') ?? types[0];
        if (!preferred) { setInitialising(false); return; }
        const {id} = await agentRPCClient.createAgent({agentType: preferred.type, headless: true});
        if (cancelled) {
          agentRPCClient.deleteAgent({agentId: id, reason: 'Documents app cancelled'}).catch(() => {});
          return;
        }
        agentRef.current = id;
        setAgentId(id);
      } catch {
        // AI features will be unavailable — non-blocking
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();
    return () => {
      cancelled = true;
      if (agentRef.current) {
        agentRPCClient.deleteAgent({agentId: agentRef.current, reason: 'Documents app unmounted'}).catch(() => {});
        agentRef.current = null;
      }
    };
  }, []);

  return {agentId, initialising};
}

// ─── useAIEdit ────────────────────────────────────────────────────────────────

function useAIEdit(agentId: string | null) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendEdit = useCallback(async (selectedText: string, instruction: string) => {
    if (!agentId) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setResponse(null);

    const prompt = `You are a precise markdown document editor. Rewrite the following selected text based on the user's instruction.

Selected text:
\`\`\`
${selectedText}
\`\`\`

Instruction: ${instruction}

Respond with ONLY the rewritten text. No explanation, no preamble, no code fences around the response. Output exactly what should replace the selected text in the document.`;

    try {
      // Snapshot position before sending so we only read the new response
      const {position: startPos} = await agentRPCClient.getAgentEvents({agentId, fromPosition: 0});
      await agentRPCClient.sendInput({agentId, input: {from: 'Documents app', message: prompt}});

      let accumulated = '';
      let gotResponse = false;

      for await (const chunk of agentRPCClient.streamAgentEvents({agentId, fromPosition: startPos}, ac.signal)) {
        for (const event of chunk.events) {
          if (event.type === 'output.chat') {
            accumulated += event.message;
            setResponse(accumulated);
            gotResponse = true;
          }
          if (event.type === 'agent.status' && event.inputExecutionQueue.length === 0 && gotResponse) {
            setLoading(false);
            return;
          }
        }
      }
    } catch (e: any) {
      if (!ac.signal.aborted) toastManager.error(e.message || 'AI edit failed', {duration: 4000});
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [agentId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const clear = useCallback(() => setResponse(null), []);

  return {loading, response, sendEdit, cancel, clear};
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextSelection {
  start: number;
  end: number;
  text: string;
}

type RightPanel = 'preview' | 'ai';

// ─── AIEditPanel ──────────────────────────────────────────────────────────────

interface AIEditPanelProps {
  selection: TextSelection | null;
  agentId: string | null;
  initialising: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  loading: boolean;
  response: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  onApply: () => void;
  onClearResponse: () => void;
}

function AIEditPanel({
  selection, agentId, initialising, prompt, onPromptChange,
  loading, response, onSubmit, onCancel, onApply, onClearResponse,
}: AIEditPanelProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Focus prompt when selection changes
  useEffect(() => {
    if (selection && promptRef.current) {
      promptRef.current.focus();
    }
  }, [selection?.start, selection?.end]);

  if (initialising) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="w-5 h-5 text-muted animate-spin" />
        <p className="text-xs text-muted">Starting AI editor…</p>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Bot className="w-10 h-10 text-muted opacity-30" />
        <p className="text-sm text-muted">AI editing unavailable</p>
        <p className="text-2xs text-dim">No writer agent could be started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Panel header */}
      <div className="shrink-0 px-4 py-3 border-b border-primary flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="text-sm font-semibold text-primary">AI Edit</span>
        {loading && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin ml-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 min-h-0">
        {/* No selection hint */}
        {!selection ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400 opacity-50" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Select text to edit with AI</p>
              <p className="text-xs text-muted">Highlight any part of your document in the editor</p>
            </div>
            <div className="flex items-center gap-1 text-2xs text-dim mt-1">
              <span className="font-medium text-muted">1.</span> Highlight text
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="font-medium text-muted">2.</span> Type instruction
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span className="font-medium text-muted">3.</span> Apply
            </div>
          </div>
        ) : (
          <>
            {/* Selected text preview */}
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-muted uppercase tracking-wide">
                Selected text ({selection.end - selection.start} chars)
              </label>
              <div className="bg-tertiary border border-primary rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-2xs text-primary font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {selection.text}
                </pre>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-muted uppercase tracking-wide">
                Instruction
              </label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => onPromptChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (prompt.trim() && !loading) onSubmit();
                  }
                }}
                placeholder="e.g. Make this more concise, Fix the grammar, Convert to a bullet list, Make it more formal..."
                rows={3}
                disabled={loading}
                className="w-full bg-input border border-primary rounded-lg p-3 text-xs text-primary placeholder-muted resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50 transition-all leading-relaxed"
                aria-label="AI instruction"
              />
              <p className="text-2xs text-dim">Ctrl/⌘+Enter to submit</p>
            </div>

            {/* AI Response */}
            {response !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-semibold text-muted uppercase tracking-wide">
                    {loading ? 'Generating…' : 'AI Response'}
                  </label>
                  {!loading && (
                    <button
                      onClick={onClearResponse}
                      className="p-0.5 text-muted hover:text-primary focus-ring rounded cursor-pointer"
                      aria-label="Clear response"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className={cn(
                  'bg-tertiary border rounded-lg p-3 overflow-y-auto transition-colors',
                  loading ? 'border-indigo-500/40' : 'border-green-500/40',
                  response.length > 400 ? 'max-h-52' : ''
                )}>
                  <pre className="text-2xs text-primary font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {response}
                    {loading && (
                      <span className="inline-block w-1.5 h-3 bg-indigo-400 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar — only when selection is active */}
      {selection && (
        <div className="shrink-0 border-t border-primary p-3 flex flex-col gap-2">
          {response && !loading && (
            <button
              onClick={onApply}
              className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors focus-ring shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Apply Changes
            </button>
          )}
          {loading ? (
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-2 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium rounded-lg transition-colors focus-ring cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!prompt.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors focus-ring shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {response ? 'Re-generate' : 'Ask AI'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SaveAsModal ──────────────────────────────────────────────────────────────

interface SaveAsModalProps {
  providers: string[];
  initialPath: string;
  onSave: (path: string, provider: string) => Promise<void>;
  onClose: () => void;
}

function SaveAsModal({providers, initialPath, onSave, onClose}: SaveAsModalProps) {
  const [path, setPath] = useState(initialPath);
  const [provider, setProvider] = useState(providers[0] ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async () => {
    if (!path.trim() || !provider) return;
    setSaving(true);
    try { await onSave(path.trim(), provider); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-secondary border border-primary rounded-xl p-5 w-96 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">Save As</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary focus-ring rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {providers.length > 1 && (
            <div className="space-y-1">
              <label className="text-2xs font-semibold text-muted uppercase tracking-wide">Location</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full bg-input border border-primary rounded-lg px-3 py-2 text-xs text-primary focus-ring"
              >
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-muted uppercase tracking-wide">File path</label>
            <input
              ref={inputRef}
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !saving) handleSubmit();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="documents/my-file.md"
              className="w-full bg-input border border-primary rounded-lg px-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-primary text-muted hover:text-primary hover:bg-hover text-xs font-medium rounded-lg transition-colors focus-ring cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!path.trim() || !provider || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors focus-ring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DocumentsApp ─────────────────────────────────────────────────────────────

export default function DocumentsApp() {
  const location = useLocation();
  const fsProviders = useFilesystemProviders();
  const {agentId, initialising} = useInitAgent();
  const {loading: aiLoading, response: aiResponse, sendEdit, cancel: cancelAI, clear: clearAI} = useAIEdit(agentId);

  const [content, setContent] = useState(INITIAL_CONTENT);
  const [title, setTitle] = useState('Untitled Document');
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>('preview');
  const [aiPrompt, setAiPrompt] = useState('');

  // Save state
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState(INITIAL_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);

  const isDirty = content !== savedContent;
  const providers = fsProviders.data?.providers ?? [];

  // Load file from FilesApp navigation state
  useEffect(() => {
    const state = location.state as {filePath?: string; fileContent?: string; title?: string; provider?: string} | null;
    if (state?.fileContent !== undefined) {
      setContent(state.fileContent);
      setSavedContent(state.fileContent);
      if (state.filePath) setCurrentFilePath(state.filePath);
      if (state.provider) setCurrentProvider(state.provider);
      if (state.title) setTitle(state.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    if (!currentFilePath || !currentProvider) { setShowSaveAs(true); return; }
    setIsSaving(true);
    try {
      await filesystemRPCClient.writeFile({path: currentFilePath, content, provider: currentProvider});
      setSavedContent(content);
      toastManager.success('Saved', {duration: 2000});
    } catch (e: any) {
      toastManager.error(e.message || 'Save failed', {duration: 4000});
    } finally {
      setIsSaving(false);
    }
  }, [currentFilePath, currentProvider, content]);

  const handleSaveAs = useCallback(async (path: string, provider: string) => {
    await filesystemRPCClient.writeFile({path, content, provider});
    setCurrentFilePath(path);
    setCurrentProvider(provider);
    setSavedContent(content);
    setShowSaveAs(false);
    const name = path.split('/').pop() || path;
    setTitle(name.replace(/\.md$/i, ''));
    toastManager.success('Saved', {duration: 2000});
  }, [content]);

  // Ctrl/Cmd+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stats = React.useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return {words, chars: content.length};
  }, [content]);

  // Capture textarea selection
  const captureSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setSelection(null);
      return;
    }
    setSelection({start, end, text: ta.value.slice(start, end)});
    // Auto-switch to AI panel when something is selected
    setRightPanel('ai');
  }, []);

  // Apply AI response into the document
  const applyAIResponse = useCallback(() => {
    if (!aiResponse || !selection) return;
    const before = content.slice(0, selection.start);
    const after = content.slice(selection.end);
    const newContent = before + aiResponse + after;
    setContent(newContent);
    const newPos = selection.start + aiResponse.length;
    clearAI();
    setAiPrompt('');
    setSelection(null);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
        ta.focus();
      }
    });
    toastManager.success('Changes applied', {duration: 2000});
  }, [aiResponse, selection, content, clearAI]);

  const handleSubmitAI = useCallback(async () => {
    if (!selection || !aiPrompt.trim()) return;
    await sendEdit(selection.text, aiPrompt.trim());
  }, [selection, aiPrompt, sendEdit]);

  // Clear selection + AI state when switching away from AI panel
  const handlePanelToggle = useCallback((panel: RightPanel) => {
    setRightPanel(panel);
    if (panel === 'preview') {
      setSelection(null);
      clearAI();
    }
  }, [clearAI]);

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-hidden">
      {showSaveAs && (
        <SaveAsModal
          providers={providers}
          initialPath={currentFilePath ?? `${title.toLowerCase().replace(/\s+/g, '-')}.md`}
          onSave={handleSaveAs}
          onClose={() => setShowSaveAs(false)}
        />
      )}

      {/* App header */}
      <div className="shrink-0 border-b border-primary bg-secondary px-4 py-2.5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center shadow-sm shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>

        {/* Editable document title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold text-primary placeholder-muted focus:outline-none min-w-0"
          placeholder="Document title…"
          aria-label="Document title"
        />

        {/* Save controls */}
        <div className="flex items-center gap-1 shrink-0">
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title={currentFilePath ? `Save (Ctrl/⌘+S)` : 'Save As…'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors focus-ring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {currentFilePath ? 'Save' : 'Save As…'}
          </button>
          {currentFilePath && (
            <button
              onClick={() => setShowSaveAs(true)}
              title="Save As…"
              className="px-2 py-1.5 text-xs text-muted hover:text-primary hover:bg-hover rounded-lg transition-colors focus-ring cursor-pointer"
            >
              Save As…
            </button>
          )}
        </div>

        {/* Panel toggle */}
        <div className="flex rounded-lg border border-primary overflow-hidden shrink-0">
          <button
            onClick={() => handlePanelToggle('preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors focus-ring cursor-pointer',
              rightPanel === 'preview'
                ? 'bg-indigo-600 text-white'
                : 'text-muted hover:text-primary hover:bg-hover'
            )}
            aria-pressed={rightPanel === 'preview'}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => handlePanelToggle('ai')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors focus-ring cursor-pointer',
              rightPanel === 'ai'
                ? 'bg-indigo-600 text-white'
                : 'text-muted hover:text-primary hover:bg-hover',
            )}
            aria-pressed={rightPanel === 'ai'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {initialising ? 'AI…' : 'AI Edit'}
            {/* Indicator dot when text is selected */}
            {selection && rightPanel !== 'ai' && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Body: editor + right panel */}
      <div className="flex flex-1 min-h-0">

        {/* ── Markdown editor ── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-primary">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => {
              setContent(e.target.value);
              // Update selection text if still valid
              const ta = e.target;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              if (selection && start !== end) {
                setSelection({start, end, text: ta.value.slice(start, end)});
              }
            }}
            onSelect={captureSelection}
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            className="flex-1 resize-none bg-primary text-primary text-sm font-mono p-5 leading-7 focus:outline-none placeholder-muted"
            placeholder="Start writing markdown here…"
            spellCheck={false}
            aria-label="Markdown editor"
            aria-multiline="true"
          />

          {/* Status bar */}
          <div className="shrink-0 h-8 border-t border-primary bg-secondary flex items-center px-4 gap-4 text-2xs text-muted select-none">
            <span>{stats.words} words</span>
            <span>{stats.chars} chars</span>
            {selection && (
              <span className="text-indigo-400 font-semibold">
                {selection.end - selection.start} chars selected
              </span>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-80 xl:w-96 shrink-0 flex flex-col min-h-0 hidden lg:flex">
          {rightPanel === 'preview' ? (
            <MarkdownPreview content={content} />
          ) : (
            <AIEditPanel
              selection={selection}
              agentId={agentId}
              initialising={initialising}
              prompt={aiPrompt}
              onPromptChange={setAiPrompt}
              loading={aiLoading}
              response={aiResponse}
              onSubmit={handleSubmitAI}
              onCancel={cancelAI}
              onApply={applyAIResponse}
              onClearResponse={clearAI}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MarkdownPreview ──────────────────────────────────────────────────────────

function MarkdownPreview({content}: {content: string}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Panel label */}
      <div className="shrink-0 px-4 py-3 border-b border-primary flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted shrink-0" />
        <span className="text-sm font-semibold text-primary">Preview</span>
      </div>
      <div className="p-5">
        <article className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:text-primary prose-p:text-secondary prose-code:text-primary
          prose-a:text-indigo-500 prose-strong:text-primary prose-blockquote:text-muted
          prose-code:bg-tertiary prose-code:rounded prose-code:px-1 prose-code:py-0.5
          prose-pre:bg-tertiary prose-pre:border prose-pre:border-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
