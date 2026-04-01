import Editor from '@monaco-editor/react';
import {Loader2, PenTool, Play, Plus, Send, Square} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import AutoScrollContainer from '../../components/chat/AutoScrollContainer.tsx';
import MessageList from '../../components/chat/MessageList.tsx';
import ResizableSplit from '../../components/ui/ResizableSplit.tsx';
import {toastManager} from '../../components/ui/toast.tsx';
import {useAgentEventState} from '../../hooks/useAgentEventState.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {agentRPCClient} from '../../rpc.ts';
import type {ChatMessage} from '../../types/agent-events.ts';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvas</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
    }
    h1 { color: #7c3aed; margin-bottom: 8px; }
    p { color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Hello, Canvas!</h1>
  <p>Start chatting with the agent below to build something amazing.</p>
</body>
</html>`;

function extractLatestHtmlBlock(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type === 'output.chat' && 'message' in msg) {
      const text = (msg as {message: string}).message;
      const match = text.match(/```(?:html)\n([\s\S]*?)```/);
      if (match) return match[1].trim();
    }
  }
  return null;
}

// ─── Root component ────────────────────────────────────────────────────────────

export default function CanvasApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentId = searchParams.get('agent');

  const handleLaunch = useCallback((id: string) => {
    setSearchParams({ agent: id }, { replace: false });
  }, [setSearchParams]);

  const handleNewCanvas = useCallback(() => {
    setSearchParams({}, { replace: false });
  }, [setSearchParams]);

  if (!agentId) {
    return <CanvasLauncher onLaunch={handleLaunch} />;
  }

  return <CanvasWorkspace key={agentId} agentId={agentId} onNewCanvas={handleNewCanvas} />;
}

// ─── Launcher ──────────────────────────────────────────────────────────────────

function CanvasLauncher({ onLaunch }: { onLaunch: (id: string) => void }) {
  const [creating, setCreating] = useState(false);

  const launch = async () => {
    setCreating(true);
    try {
      const { id } = await agentRPCClient.createAgent({ agentType: 'canvas', headless: false });
      onLaunch(id);
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to launch Canvas agent', { duration: 5000 });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-primary">
      <div className="shrink-0 border-b border-primary bg-secondary px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
          <PenTool className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-primary">Canvas</h1>
          <p className="text-2xs text-muted">Build interactive frontend code with agents</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-secondary border border-primary rounded-xl p-8 flex flex-col items-center text-center gap-5 max-w-sm w-full shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
            <PenTool className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">Canvas</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed max-w-xs">
              Build interactive web apps and frontend code with an AI agent. Edit HTML/CSS/JS and preview results instantly.
            </p>
          </div>
          <button
            onClick={launch}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring shadow-button-primary"
          >
            {creating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Launching...</>
              : <>Open Canvas</>
            }
          </button>
          <p className="text-2xs text-muted">Powered by TokenRing AI agents</p>
        </div>
      </div>
    </div>
  );
}

// ─── Workspace ─────────────────────────────────────────────────────────────────

function CanvasWorkspace({ agentId, onNewCanvas }: { agentId: string; onNewCanvas: () => void }) {
  const [theme] = useTheme();
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [previewHtml, setPreviewHtml] = useState(DEFAULT_HTML);
  const [autoPreview, setAutoPreview] = useState(true);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, agentStatus } = useAgentEventState(agentId);
  const idle = agentStatus.status === 'running' && agentStatus.inputExecutionQueue.length === 0;

  // Extract latest HTML block produced by the agent and sync to editor
  const latestHtmlFromAgent = useMemo(() => extractLatestHtmlBlock(messages), [messages]);

  useEffect(() => {
    if (latestHtmlFromAgent) {
      setHtmlContent(latestHtmlFromAgent);
      if (autoPreview) {
        setPreviewHtml(latestHtmlFromAgent);
      }
    }
  }, [latestHtmlFromAgent]); // intentionally not including autoPreview — only sync on new agent output

  const handleEditorChange = (value: string | undefined) => {
    const newVal = value ?? '';
    setHtmlContent(newVal);
    if (autoPreview) {
      setPreviewHtml(newVal);
    }
  };

  const runPreview = () => setPreviewHtml(htmlContent);

  const handleSubmit = async () => {
    if (!input.trim() || !idle) return;
    const message = input;
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    try {
      await agentRPCClient.sendInput({
        agentId,
        input: { from: 'Chat webapp user', message },
      });
    } catch (error: any) {
      toastManager.error(error.message || 'Failed to send message', { duration: 5000 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-primary bg-secondary px-4 py-2 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
          <PenTool className="w-3.5 h-3.5 text-white" />
        </div>
        <h1 className="text-sm font-semibold text-primary shrink-0">Canvas</h1>
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${idle ? 'bg-indigo-500' : 'bg-amber-500 animate-pulse'}`} />
        <span className="text-2xs text-muted truncate hidden sm:block min-w-0">{agentStatus.currentActivity}</span>

        <div className="flex-1" />

        {/* Auto-preview toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={autoPreview}
            onChange={e => setAutoPreview(e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
          />
          <span className="text-2xs text-muted select-none">Auto-preview</span>
        </label>

        {/* Manual run button (shown when auto-preview is off) */}
        {!autoPreview && (
          <button
            onClick={runPreview}
            title="Run preview"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-500 dark:text-emerald-400 text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring shrink-0"
          >
            <Play className="w-3 h-3" />
            Run
          </button>
        )}

        {/* New canvas button */}
        <button
          onClick={onNewCanvas}
          title="New canvas"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-500 dark:text-indigo-400 text-xs font-medium rounded-lg transition-colors cursor-pointer focus-ring shrink-0"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* ── Vertical split: (editor + preview) | chat ──────────────────────── */}
      <ResizableSplit
        direction="vertical"
        initialRatio={0.65}
        minFirst={120}
        minSecond={120}
        className="flex-1 min-h-0"
      >
        {/* ── Horizontal split: editor | preview ─────────────────────────── */}
        <ResizableSplit
          direction="horizontal"
          initialRatio={0.5}
          minFirst={160}
          minSecond={160}
          className="h-full"
        >
          {/* Code editor */}
          <div className="h-full flex flex-col border-r border-primary">
            <div className="shrink-0 px-3 py-1.5 bg-tertiary/60 border-b border-primary flex items-center gap-2">
              <span className="text-2xs font-mono font-semibold text-muted uppercase tracking-wider">HTML / CSS / JS</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="html"
                value={htmlContent}
                onChange={handleEditorChange}
                theme={theme === 'light' ? 'vs-light' : 'vs-dark'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  padding: { top: 8 },
                }}
              />
            </div>
          </div>

          {/* Preview iframe */}
          <div className="h-full flex flex-col">
            <div className="shrink-0 px-3 py-1.5 bg-tertiary/60 border-b border-primary flex items-center gap-2">
              <span className="text-2xs font-mono font-semibold text-muted uppercase tracking-wider">Preview</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
            </div>
            <iframe
              className="flex-1 w-full bg-white border-0"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-same-origin"
              title="Canvas preview"
            />
          </div>
        </ResizableSplit>

        {/* ── Chat pane ───────────────────────────────────────────────────── */}
        <div className="h-full flex flex-col border-t border-primary">
          {/* Message stream */}
          <AutoScrollContainer>
            <MessageList
              messages={messages}
              agentId={agentId}
              agentStatus={agentStatus}
            />
          </AutoScrollContainer>

          {/* Input bar */}
          <div className="shrink-0 border-t border-primary bg-secondary flex items-center gap-3 px-4 py-2.5">
            <span className="text-accent font-bold text-base shrink-0 select-none">&gt;</span>
            <label htmlFor="canvas-input" className="sr-only">Send message to Canvas agent</label>
            <textarea
              ref={textareaRef}
              id="canvas-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!idle}
              rows={1}
              placeholder={idle ? 'Describe what to build or modify...' : 'Agent is working...'}
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-mono text-primary placeholder-muted outline-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: '5rem' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
              }}
            />
            {idle ? (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                aria-label="Send message"
                className="p-1.5 rounded-md hover:bg-hover text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => agentRPCClient.abortCurrentOperation({ agentId, message: 'User aborted' })}
                aria-label="Abort current operation"
                className="p-1.5 rounded-md hover:bg-hover text-muted hover:text-error transition-colors focus-ring cursor-pointer shrink-0"
              >
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </ResizableSplit>
    </div>
  );
}
