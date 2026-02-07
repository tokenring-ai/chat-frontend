import { Routes, Route, useLocation, useParams } from 'react-router-dom';
import './index.css';
import { useAgentList, useAgentTypes, useWorkflows } from "./rpc.ts";
import AgentSelection from './pages/AgentSelection.tsx';
import ChatPage from './pages/ChatPage.tsx';
import Sidebar from './components/Sidebar.tsx';
import { SidebarProvider } from './components/SidebarContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { ChatInputProvider } from './components/ChatInputContext.tsx';
import { ToastContainer, notificationManager } from './components/ui/Toast.tsx';
import { useEffect, useState } from 'react';

export default function App() {
  const location = useLocation();
  const [toasts, setToasts] = useState<any[]>();

  const agents = useAgentList();
  const agentTypes = useAgentTypes();
  const workflows = useWorkflows();

  useEffect(() => {
    const cleanup = notificationManager.subscribeToasts(setToasts);
    return cleanup as () => void;
  }, []);

  if (agents.isLoading || agentTypes.isLoading || workflows.isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh text-lg text-muted bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
          <span>Loading TokenRing...</span>
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
          <div className="flex h-dvh bg-primary/50 text-secondary antialiased font-sans selection:bg-indigo-500/30 overflow-hidden">
            <Sidebar
              currentAgentId={currentAgentId || ''}
              agents={agents}
              workflows={workflows}
              agentTypes={agentTypes}
            />
            <div className="flex-1 flex flex-col relative min-w-0">
              <main className="flex-1 min-h-0 relative">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/agent/:agentId/*" element={<ChatPage key={currentAgentId} agentId={currentAgentId!} />} />
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
