import {Loader2} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import './index.css';
import {StorageErrorBanner} from './components/chat/StorageErrorBanner.tsx';
import {ChatInputProvider} from './components/ChatInputContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import ModelSelector from './components/ModelSelector.tsx';
import Sidebar from './components/Sidebar.tsx';
import {SidebarProvider} from './components/SidebarContext.tsx';
import ToolSelector from './components/ToolSelector.tsx';
import TopBar from './components/TopBar.tsx';
import {notificationManager, ToastContainer} from './components/ui/toast.tsx';
import AgentSelection from './pages/AgentSelection.tsx';
import ChatPage from './pages/ChatPage.tsx';
import {useAgentList, useAgentTypes, useWorkflows} from "./rpc.ts";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<any[]>();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const loadingBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const agents = useAgentList();
  const agentTypes = useAgentTypes();
  const workflows = useWorkflows();

  useEffect(() => {
    const cleanup = notificationManager.subscribeToasts(setToasts);
    return cleanup as () => void;
  }, []);

  // Show loading bar during route transitions
  useEffect(() => {
    setShowLoadingBar(true);
    if (loadingBarTimeoutRef.current) {
      clearTimeout(loadingBarTimeoutRef.current);
    }
    loadingBarTimeoutRef.current = setTimeout(() => {
      setShowLoadingBar(false);
    }, 300);
    return () => {
      if (loadingBarTimeoutRef.current) {
        clearTimeout(loadingBarTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  // Handle loading state
  if (agents.isLoading || agentTypes.isLoading || workflows.isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-primary/50 text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-indigo-500 rounded-full animate-spin shadow-card" />
          <span className="text-sm font-medium">Loading TokenRing...</span>
        </div>
      </div>
    );
  }

  // Handle error state with retry option
  if (agents.error || agentTypes.error || workflows.error) {
    const error = agents.error || agentTypes.error || workflows.error;
    const errorMessage = error instanceof Error ? error.message : 'Failed to load application data';

    return (
      <div className="flex items-center justify-center h-dvh bg-primary/50 p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shadow-card">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-primary mb-2">Failed to Load</h1>
            <p className="text-sm text-muted mb-4">{errorMessage}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-button transition-colors focus-ring font-medium flex items-center gap-2 shadow-button-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const currentAgentId = location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null;

  return (
    <SidebarProvider>
      <ChatInputProvider>
        <ErrorBoundary>
          <ToastContainer toasts={toasts || []} onRemove={(id) => notificationManager.removeToast(id)}/>
          {/* Route transition loading bar */}
          {showLoadingBar && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 z-[100]"/>
          )}
          <div className="flex flex-col h-dvh bg-primary/50 text-secondary antialiased font-sans selection:bg-indigo-500/30 overflow-hidden">
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus-ring"
            >
              Skip to main content
            </a>
            <TopBar
              currentAgentId={currentAgentId}
              agents={agents}
              agentControls={currentAgentId ? (
                <>
                  <ModelSelector agentId={currentAgentId} />
                  <ToolSelector agentId={currentAgentId} />
                </>
              ) : undefined}
            />
            {/* Storage error banner - shows when localStorage is unavailable */}
            <StorageErrorBanner/>
            <div className="flex flex-1 min-h-0">
              <Sidebar
                currentAgentId={currentAgentId || ''}
                agents={agents}
                workflows={workflows}
                agentTypes={agentTypes}
              />
              <main id="main-content" className="flex-1 min-w-0 relative">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/agent/:agentId/*" element={
                      currentAgentId && agents.data && !agents.data.find(a => a.id === currentAgentId)
                        ? (
                          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <div className="mb-6 max-w-md">
                              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 shadow-card">
                                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                              </div>
                              <h1 className="text-lg font-semibold text-primary mb-2">Agent Not Found</h1>
                              <p className="text-sm text-muted">
                                The agent <code
                                className="px-1.5 py-0.5 bg-tertiary border border-primary rounded-md text-primary font-mono text-xs">{currentAgentId}</code>
                                could not be found.<br /> It may have been stopped or removed.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setIsNavigating(true);
                                navigate('/');
                              }}
                              disabled={isNavigating}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-button transition-colors focus-ring font-medium flex items-center gap-2 shadow-button-primary"
                              aria-busy={isNavigating}
                            >
                              {isNavigating ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin"/>
                                  <span>Navigating...</span>
                                </>
                              ) : (
                                <span>Browse Available Agents</span>
                              )}
                            </button>
                          </div>
                        )
                        : <ChatPage key={currentAgentId} agentId={currentAgentId!} />
                    } />
                    <Route path="/" element={
                      <AgentSelection
                        agents={agents}
                        agentTypes={agentTypes}
                        workflows={workflows}
                      />
                    } />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </ErrorBoundary>
      </ChatInputProvider>
    </SidebarProvider>
  );
}
