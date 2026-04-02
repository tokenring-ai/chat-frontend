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
import AgentsApp from './pages/apps/AgentsApp.tsx';
import BlogApp from './pages/apps/BlogApp.tsx';
import CalendarApp from './pages/apps/CalendarApp.tsx';
import CanvasApp from './pages/apps/CanvasApp.tsx';
import DocumentsApp from './pages/apps/DocumentsApp.tsx';
import EmailApp from './pages/apps/EmailApp.tsx';
import FilesApp from './pages/apps/FilesApp.tsx';
import MediaApp from './pages/apps/MediaApp.tsx';
import MessagingApp from './pages/apps/MessagingApp.tsx';
import PluginsApp from './pages/apps/PluginsApp.tsx';
import ServicesApp from './pages/apps/ServicesApp.tsx';
import SettingsApp from './pages/apps/SettingsApp.tsx';
import SocialApp from './pages/apps/SocialApp.tsx';
import StocksApp from './pages/apps/StocksApp.tsx';
import TerminalApp from './pages/apps/TerminalApp.tsx';
import VaultApp from './pages/apps/VaultApp.tsx';
import WorkflowsApp from './pages/apps/WorkflowsApp.tsx';
import ChatPage from './pages/ChatPage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import {useAgentList, useAgentTypes, useWorkflows} from './rpc.ts';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<any[]>();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const loadingBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // These are used by Sidebar and TopBar — load them at app level for shared access
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

  const currentAgentId = location.pathname.startsWith('/agent/') ? location.pathname.split('/')[2] : null;

  return (
    <SidebarProvider>
      <ChatInputProvider>
        <ErrorBoundary>
          <ToastContainer toasts={toasts || []} onRemove={(id) => notificationManager.removeToast(id)}/>
          {/* Route transition loading bar */}
          {showLoadingBar && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent to-accent z-[100]"/>
          )}
          <div className="flex flex-col h-dvh bg-primary/50 text-secondary antialiased font-sans selection:bg-active overflow-hidden">
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-primary focus:rounded-lg focus-ring"
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
                    {/* Dashboard home */}
                    <Route path="/" element={<Dashboard/>}/>

                    {/* App routes */}
                    <Route path="/agents" element={<AgentsApp/>}/>
                    <Route path="/workflows" element={<WorkflowsApp/>}/>
                    <Route path="/canvas" element={<CanvasApp/>}/>
                    <Route path="/documents" element={<DocumentsApp/>}/>
                    <Route path="/blog" element={<BlogApp/>}/>
                    <Route path="/files" element={<FilesApp/>}/>
                    <Route path="/terminal" element={<TerminalApp/>}/>
                    <Route path="/email" element={<EmailApp/>}/>
                    <Route path="/calendar" element={<CalendarApp/>}/>
                    <Route path="/media" element={<MediaApp/>}/>
                    <Route path="/social" element={<SocialApp/>}/>
                    <Route path="/messaging" element={<MessagingApp/>}/>
                    <Route path="/stocks" element={<StocksApp/>}/>
                    <Route path="/plugins" element={<PluginsApp/>}/>
                    <Route path="/services" element={<ServicesApp/>}/>
                    <Route path="/settings" element={<SettingsApp/>}/>
                    <Route path="/vault" element={<VaultApp/>}/>

                    {/* Agent chat — existing */}
                    <Route path="/agent/:agentId/*" element={
                      currentAgentId && agents.data && !agents.data.find(a => a.id === currentAgentId)
                        ? (
                          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <div className="mb-6 max-w-md">
                              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4 shadow-card">
                                <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                navigate('/agents');
                              }}
                              disabled={isNavigating}
                              className="px-5 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-primary rounded-button transition-colors focus-ring font-medium flex items-center gap-2 shadow-button-primary"
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
